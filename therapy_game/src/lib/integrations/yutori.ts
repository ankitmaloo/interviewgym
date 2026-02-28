import type { TavilyResult } from "@/lib/integrations/tavily";
import { hydrateServerEnv } from "@/lib/serverEnv";

export type RoleScoutInput = {
    role: string;
    domain: string;
    aspiration: string;
    location?: string;
    searchQuery?: string;
    notes?: string;
};

export type PostingCandidate = {
    title: string;
    company: string;
    location: string;
    url: string;
    source: string;
    summary: string;
};

function inferCompanyFromTitle(title: string): string {
    const separators = [" - ", " | ", " at ", " @ "];
    for (const separator of separators) {
        const parts = title.split(separator);
        if (parts.length > 1) {
            return parts[parts.length - 1].trim();
        }
    }
    return "Unknown company";
}

function summarizeSnippet(snippet: string, fallback: string): string {
    const cleaned = snippet.replace(/\s+/g, " ").trim();
    if (!cleaned) {
        return fallback;
    }

    if (cleaned.length <= 220) {
        return cleaned;
    }

    return `${cleaned.slice(0, 217)}...`;
}

function fallbackCuration(
    roleContext: RoleScoutInput,
    results: TavilyResult[]
): PostingCandidate[] {
    return results.slice(0, 8).map((result) => ({
        title: result.title,
        company: inferCompanyFromTitle(result.title),
        location: roleContext.location?.trim() || "Not specified",
        url: result.url,
        source: "Tavily via Yutori",
        summary: summarizeSnippet(
            result.content,
            `${roleContext.role} opportunity aligned to ${roleContext.domain}.`
        ),
    }));
}

export async function curatePostingsWithYutori(input: {
    roleContext: RoleScoutInput;
    tavilyResults: TavilyResult[];
}): Promise<{
    provider: "yutori" | "fallback";
    postings: PostingCandidate[];
    notes?: string;
}> {
    hydrateServerEnv(["YUTORI_"]);
    const apiUrl = process.env.YUTORI_API_URL;
    const apiKey = process.env.YUTORI_API_KEY;

    if (!apiUrl || !apiKey) {
        return {
            provider: "fallback",
            postings: fallbackCuration(input.roleContext, input.tavilyResults),
            notes:
                "Yutori API not configured. Returned deterministic curation from Tavily results.",
        };
    }

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            task: "curate-role-postings",
            roleContext: input.roleContext,
            tavilyResults: input.tavilyResults,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Yutori request failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const items = Array.isArray(payload.postings) ? payload.postings : [];

    const postings = items
        .map((item) => {
            if (!item || typeof item !== "object") {
                return null;
            }

            const candidate = item as Record<string, unknown>;
            const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
            const url = typeof candidate.url === "string" ? candidate.url.trim() : "";

            if (!title || !url) {
                return null;
            }

            return {
                title,
                company:
                    typeof candidate.company === "string" && candidate.company.trim()
                        ? candidate.company.trim()
                        : inferCompanyFromTitle(title),
                location:
                    typeof candidate.location === "string"
                        ? candidate.location.trim()
                        : input.roleContext.location?.trim() || "Not specified",
                url,
                source:
                    typeof candidate.source === "string" && candidate.source.trim()
                        ? candidate.source.trim()
                        : "Yutori",
                summary:
                    typeof candidate.summary === "string"
                        ? summarizeSnippet(
                              candidate.summary,
                              `${input.roleContext.role} opportunity curated by Yutori.`
                          )
                        : `${input.roleContext.role} opportunity curated by Yutori.`,
            };
        })
        .filter((item): item is PostingCandidate => item !== null);

    if (postings.length === 0) {
        return {
            provider: "fallback",
            postings: fallbackCuration(input.roleContext, input.tavilyResults),
            notes:
                "Yutori returned no usable postings. Fell back to deterministic Tavily curation.",
        };
    }

    return {
        provider: "yutori",
        postings,
        notes:
            typeof payload.notes === "string" ? payload.notes.trim() : undefined,
    };
}
