import type { TavilyResult } from "@/lib/integrations/tavily";
import { hydrateServerEnv } from "@/lib/serverEnv";

export type RoleScoutInput = {
    role: string;
    domain: string;
    aspiration: string;
    skillFocus?: string[];
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
    jobDescription: string;
    skills: string[];
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

const SKILL_PATTERNS: Array<{ label: string; regex: RegExp }> = [
    { label: "typescript", regex: /\btypescript\b/i },
    { label: "javascript", regex: /\bjavascript\b/i },
    { label: "python", regex: /\bpython\b/i },
    { label: "java", regex: /\bjava\b/i },
    { label: "go", regex: /\b(golang|go)\b/i },
    { label: "node.js", regex: /\b(node|node\.js)\b/i },
    { label: "react", regex: /\breact\b/i },
    { label: "next.js", regex: /\bnext(\.js)?\b/i },
    { label: "aws", regex: /\baws\b/i },
    { label: "gcp", regex: /\bgcp|google cloud\b/i },
    { label: "azure", regex: /\bazure\b/i },
    { label: "kubernetes", regex: /\bkubernetes|k8s\b/i },
    { label: "docker", regex: /\bdocker\b/i },
    { label: "terraform", regex: /\bterraform\b/i },
    { label: "sql", regex: /\bsql\b/i },
    { label: "postgresql", regex: /\bpostgres(ql)?\b/i },
    { label: "mongodb", regex: /\bmongodb\b/i },
    { label: "redis", regex: /\bredis\b/i },
    { label: "system design", regex: /\bsystem design\b/i },
    { label: "distributed systems", regex: /\bdistributed systems?\b/i },
    { label: "microservices", regex: /\bmicroservices?\b/i },
    { label: "api design", regex: /\b(api design|rest api|graphql)\b/i },
    { label: "data structures", regex: /\bdata structures?\b/i },
    { label: "algorithms", regex: /\balgorithms?\b/i },
    { label: "communication", regex: /\bcommunication\b/i },
    { label: "leadership", regex: /\bleadership\b/i },
    { label: "stakeholder management", regex: /\bstakeholder\b/i },
];

function extractSkillsFromText(text: string): string[] {
    if (!text.trim()) {
        return [];
    }

    return SKILL_PATTERNS.filter((pattern) => pattern.regex.test(text)).map(
        (pattern) => pattern.label
    );
}

function deriveSkillsFromTavily(input: {
    roleContext: RoleScoutInput;
    results: TavilyResult[];
}): string[] {
    const seedSkills = Array.isArray(input.roleContext.skillFocus)
        ? input.roleContext.skillFocus
              .map((item) => item.trim().toLowerCase())
              .filter(Boolean)
        : [];

    const discovered = input.results.flatMap((result) =>
        extractSkillsFromText(`${result.title}\n${result.content}`)
    );

    return [...seedSkills, ...discovered]
        .filter((item, index, arr) => arr.indexOf(item) === index)
        .slice(0, 12);
}

function fallbackCuration(
    roleContext: RoleScoutInput,
    results: TavilyResult[]
): PostingCandidate[] {
    const normalizedSkills = deriveSkillsFromTavily({
        roleContext,
        results,
    });

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
        jobDescription: summarizeSnippet(
            result.content,
            `${roleContext.role} role aligned with ${roleContext.aspiration}.`
        ),
        skills: normalizedSkills,
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
    const tavilyDerivedSkills = deriveSkillsFromTavily({
        roleContext: input.roleContext,
        results: input.tavilyResults,
    });

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
                jobDescription:
                    typeof candidate.jobDescription === "string"
                        ? summarizeSnippet(
                              candidate.jobDescription,
                              `${input.roleContext.role} role description from Yutori.`
                          )
                        : typeof candidate.summary === "string"
                          ? summarizeSnippet(
                                candidate.summary,
                                `${input.roleContext.role} role description from Yutori.`
                            )
                          : "",
                skills: Array.isArray(candidate.skills)
                    ? candidate.skills
                          .map((skill) =>
                              typeof skill === "string"
                                  ? skill.trim().toLowerCase()
                                  : ""
                          )
                          .filter(Boolean)
                          .slice(0, 12)
                    : tavilyDerivedSkills,
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
