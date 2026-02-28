import { hydrateServerEnv } from "@/lib/serverEnv";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

export type TavilyResult = {
    title: string;
    url: string;
    content: string;
    score: number;
    publishedDate: string | null;
};

export type TavilySearchOutput = {
    query: string;
    answer: string;
    results: TavilyResult[];
};

function parseResults(payload: unknown): TavilyResult[] {
    if (!payload || typeof payload !== "object") {
        return [];
    }

    const root = payload as Record<string, unknown>;
    if (!Array.isArray(root.results)) {
        return [];
    }

    return root.results
        .map((item) => {
            if (!item || typeof item !== "object") {
                return null;
            }

            const candidate = item as Record<string, unknown>;
            const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
            if (!url) {
                return null;
            }

            return {
                title:
                    typeof candidate.title === "string" && candidate.title.trim()
                        ? candidate.title.trim()
                        : "Untitled result",
                url,
                content:
                    typeof candidate.content === "string" ? candidate.content.trim() : "",
                score:
                    typeof candidate.score === "number" && Number.isFinite(candidate.score)
                        ? candidate.score
                        : 0,
                publishedDate:
                    typeof candidate.published_date === "string"
                        ? candidate.published_date
                        : null,
            };
        })
        .filter((item): item is TavilyResult => item !== null);
}

export async function tavilySearch(input: {
    query: string;
    maxResults?: number;
    includeDomains?: string[];
}): Promise<TavilySearchOutput> {
    hydrateServerEnv(["TAVILY_"]);
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        throw new Error("TAVILY_API_KEY is not configured");
    }

    const payload: Record<string, unknown> = {
        api_key: apiKey,
        query: input.query,
        search_depth: "advanced",
        max_results: input.maxResults ?? 8,
        include_answer: true,
        include_raw_content: false,
    };

    if (input.includeDomains && input.includeDomains.length > 0) {
        payload.include_domains = input.includeDomains;
    }

    const response = await fetch(TAVILY_SEARCH_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Tavily request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
        query: input.query,
        answer: typeof data.answer === "string" ? data.answer.trim() : "",
        results: parseResults(data),
    };
}
