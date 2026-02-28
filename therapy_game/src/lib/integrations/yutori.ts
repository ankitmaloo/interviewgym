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

export type InterviewSentimentDimension = {
    name: string;
    score: number;
    label: "strength" | "neutral" | "risk";
    rationale: string;
};

export type InterviewSentimentResult = {
    provider: "yutori" | "fallback";
    sentiment: "positive" | "neutral" | "negative";
    overallScore: number;
    confidence: number;
    summary: string;
    dimensions: InterviewSentimentDimension[];
    recommendations: string[];
    notes?: string;
};

export type RoleResearchBrief = {
    provider: "yutori" | "fallback";
    role: string;
    domain: string;
    headline: string;
    marketSignals: string[];
    keySkills: string[];
    likelyInterviewFocus: string[];
    preparationActions: string[];
    notes?: string;
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

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function fallbackSentimentAnalysis(input: {
    transcript: string;
    role?: string;
}): InterviewSentimentResult {
    const text = input.transcript.toLowerCase();
    const positiveMatches =
        text.match(
            /\b(improved|resolved|delivered|achieved|learned|collaborated|optimized|ownership|impact)\b/g
        )?.length ?? 0;
    const negativeMatches =
        text.match(
            /\b(stuck|failed|blame|hate|frustrated|angry|confused|never|can't|cannot)\b/g
        )?.length ?? 0;
    const fillerMatches = text.match(/\b(um|uh|like|you know)\b/g)?.length ?? 0;

    const base = 62 + positiveMatches * 4 - negativeMatches * 6 - fillerMatches * 2;
    const overallScore = clamp(Math.round(base), 0, 100);
    const confidence = clamp(0.45 + (text.length > 250 ? 0.2 : 0) + positiveMatches * 0.02, 0.35, 0.92);

    const sentiment: InterviewSentimentResult["sentiment"] =
        overallScore >= 66 ? "positive" : overallScore <= 44 ? "negative" : "neutral";

    const dimensions: InterviewSentimentDimension[] = [
        {
            name: "Professional Tone",
            score: clamp(70 + positiveMatches * 3 - negativeMatches * 8, 0, 100),
            label:
                positiveMatches >= negativeMatches + 1
                    ? "strength"
                    : negativeMatches >= positiveMatches + 1
                      ? "risk"
                      : "neutral",
            rationale:
                negativeMatches > 0
                    ? "Some phrasing trends negative under pressure."
                    : "Tone is generally constructive and interview-appropriate.",
        },
        {
            name: "Confidence Signal",
            score: clamp(64 + positiveMatches * 2 - fillerMatches * 3, 0, 100),
            label:
                fillerMatches > 6
                    ? "risk"
                    : fillerMatches > 2
                      ? "neutral"
                      : "strength",
            rationale:
                fillerMatches > 6
                    ? "Frequent filler words reduce confidence signal."
                    : "Delivery appears reasonably steady.",
        },
        {
            name: "Impact Framing",
            score: clamp(58 + positiveMatches * 4, 0, 100),
            label: positiveMatches >= 3 ? "strength" : positiveMatches >= 1 ? "neutral" : "risk",
            rationale:
                positiveMatches >= 3
                    ? "Response includes clear outcome-oriented language."
                    : "Outcome framing can be made more explicit and measurable.",
        },
    ];

    const recommendations = [
        "Anchor each answer with one measurable outcome (metric, timeframe, scope).",
        "Use concise pauses instead of filler words to strengthen delivery confidence.",
        input.role
            ? `Tie examples directly to ${input.role} expectations in your closing sentence.`
            : "Tie examples directly to role expectations in your closing sentence.",
    ];

    return {
        provider: "fallback",
        sentiment,
        overallScore,
        confidence: Number(confidence.toFixed(2)),
        summary:
            sentiment === "positive"
                ? "Interview tone is mostly constructive with good impact orientation."
                : sentiment === "negative"
                  ? "Interview tone shows risk signals; prioritize clearer, constructive framing."
                  : "Interview tone is mixed; tighten outcome framing and confidence signals.",
        dimensions,
        recommendations,
        notes:
            "Yutori sentiment API not configured or returned unusable data. Returned deterministic fallback analysis.",
    };
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

function normalizeSentimentPayload(
    payload: Record<string, unknown>
): InterviewSentimentResult | null {
    const sentimentRaw =
        typeof payload.sentiment === "string"
            ? payload.sentiment.toLowerCase()
            : "";
    const sentiment: InterviewSentimentResult["sentiment"] =
        sentimentRaw === "positive" || sentimentRaw === "negative"
            ? sentimentRaw
            : "neutral";

    const overallScoreRaw =
        typeof payload.overallScore === "number"
            ? payload.overallScore
            : typeof payload.score === "number"
              ? payload.score
              : NaN;
    if (!Number.isFinite(overallScoreRaw)) {
        return null;
    }

    const confidenceRaw =
        typeof payload.confidence === "number" ? payload.confidence : 0.6;
    const confidence = clamp(confidenceRaw, 0, 1);

    const summary =
        typeof payload.summary === "string" && payload.summary.trim()
            ? payload.summary.trim()
            : "Sentiment analysis completed.";

    const dimensionsSource = Array.isArray(payload.dimensions)
        ? payload.dimensions
        : [];
    const dimensions: InterviewSentimentDimension[] = dimensionsSource
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const candidate = item as Record<string, unknown>;
            const name =
                typeof candidate.name === "string" ? candidate.name.trim() : "";
            const rationale =
                typeof candidate.rationale === "string"
                    ? candidate.rationale.trim()
                    : "";
            const score =
                typeof candidate.score === "number"
                    ? clamp(candidate.score, 0, 100)
                    : NaN;
            const labelRaw =
                typeof candidate.label === "string"
                    ? candidate.label.toLowerCase()
                    : "neutral";
            const label: InterviewSentimentDimension["label"] =
                labelRaw === "strength" || labelRaw === "risk"
                    ? labelRaw
                    : "neutral";

            if (!name || !Number.isFinite(score)) {
                return null;
            }

            return {
                name,
                score,
                label,
                rationale: rationale || "No rationale provided.",
            };
        })
        .filter((item): item is InterviewSentimentDimension => item !== null)
        .slice(0, 6);

    const recommendationsSource = Array.isArray(payload.recommendations)
        ? payload.recommendations
        : [];
    const recommendations = recommendationsSource
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
        .slice(0, 6);

    return {
        provider: "yutori",
        sentiment,
        overallScore: clamp(Math.round(overallScoreRaw), 0, 100),
        confidence: Number(confidence.toFixed(2)),
        summary,
        dimensions,
        recommendations,
        notes: typeof payload.notes === "string" ? payload.notes.trim() : undefined,
    };
}

export async function analyzeInterviewSentimentWithYutori(input: {
    transcript: string;
    responseText?: string;
    roleContext?: {
        role?: string;
        domain?: string;
        aspiration?: string;
        difficulty?: string;
        problemTitle?: string;
    };
}): Promise<InterviewSentimentResult> {
    hydrateServerEnv(["YUTORI_"]);
    const apiUrl = process.env.YUTORI_API_URL;
    const apiKey = process.env.YUTORI_API_KEY;

    const combinedTranscript = [input.transcript, input.responseText]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join("\n")
        .trim();

    if (!apiUrl || !apiKey) {
        return fallbackSentimentAnalysis({
            transcript: combinedTranscript,
            role: input.roleContext?.role,
        });
    }

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            task: "analyze-interview-sentiment",
            transcript: input.transcript,
            responseText: input.responseText ?? "",
            roleContext: input.roleContext ?? {},
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Yutori sentiment request failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const normalized = normalizeSentimentPayload(payload);
    if (normalized) {
        return normalized;
    }

    return fallbackSentimentAnalysis({
        transcript: combinedTranscript,
        role: input.roleContext?.role,
    });
}

function fallbackRoleResearch(input: {
    role: string;
    domain: string;
    aspiration: string;
}): RoleResearchBrief {
    const role = input.role.trim() || "Target role";
    const domain = input.domain.trim() || "General domain";

    return {
        provider: "fallback",
        role,
        domain,
        headline: `${role} interview prep brief generated from deterministic fallback research.`,
        marketSignals: [
            `Demand remains strong for ${role} profiles with clear delivery impact.`,
            "Interview loops increasingly test communication of tradeoffs and execution decisions.",
            "Hiring signals favor candidates who quantify outcomes with metrics and scope.",
        ],
        keySkills: [
            `${domain} fundamentals and practical execution depth`,
            "Structured problem solving and clear prioritization",
            "Outcome communication with measurable impact",
        ],
        likelyInterviewFocus: [
            "Ownership examples with constraints and tradeoffs",
            "Cross-functional collaboration under pressure",
            "Decision quality, risk management, and learning loop",
        ],
        preparationActions: [
            "Prepare 3 role-aligned stories with context-action-result-learning structure.",
            "Attach at least one metric to each story (scale, timeframe, impact).",
            "Practice concise 90-120 second answers for common prompts.",
        ],
        notes:
            "Yutori role research API not configured or returned unusable data. Returned deterministic fallback brief.",
    };
}

function normalizeStringList(value: unknown, limit = 6): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
        .slice(0, limit);
}

function normalizeRoleResearchPayload(
    payload: Record<string, unknown>,
    fallbackInput: { role: string; domain: string }
): RoleResearchBrief | null {
    const headline =
        typeof payload.headline === "string" && payload.headline.trim()
            ? payload.headline.trim()
            : "";
    if (!headline) {
        return null;
    }

    const marketSignals = normalizeStringList(payload.marketSignals);
    const keySkills = normalizeStringList(payload.keySkills);
    const likelyInterviewFocus = normalizeStringList(payload.likelyInterviewFocus);
    const preparationActions = normalizeStringList(payload.preparationActions);

    return {
        provider: "yutori",
        role:
            typeof payload.role === "string" && payload.role.trim()
                ? payload.role.trim()
                : fallbackInput.role,
        domain:
            typeof payload.domain === "string" && payload.domain.trim()
                ? payload.domain.trim()
                : fallbackInput.domain,
        headline,
        marketSignals:
            marketSignals.length > 0
                ? marketSignals
                : ["No market signals provided by Yutori."],
        keySkills:
            keySkills.length > 0 ? keySkills : ["No key skill list provided by Yutori."],
        likelyInterviewFocus:
            likelyInterviewFocus.length > 0
                ? likelyInterviewFocus
                : ["No interview focus list provided by Yutori."],
        preparationActions:
            preparationActions.length > 0
                ? preparationActions
                : ["No preparation actions provided by Yutori."],
        notes: typeof payload.notes === "string" ? payload.notes.trim() : undefined,
    };
}

export async function researchRoleWithYutori(input: {
    role: string;
    domain: string;
    aspiration: string;
    tavilyResults: TavilyResult[];
}): Promise<RoleResearchBrief> {
    hydrateServerEnv(["YUTORI_"]);
    const apiUrl = process.env.YUTORI_API_URL;
    const apiKey = process.env.YUTORI_API_KEY;

    if (!apiUrl || !apiKey) {
        return fallbackRoleResearch(input);
    }

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            task: "research-role-interview-brief",
            roleContext: {
                role: input.role,
                domain: input.domain,
                aspiration: input.aspiration,
            },
            tavilyResults: input.tavilyResults,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Yutori research request failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const normalized = normalizeRoleResearchPayload(payload, {
        role: input.role,
        domain: input.domain,
    });
    if (normalized) {
        return normalized;
    }

    return fallbackRoleResearch(input);
}
