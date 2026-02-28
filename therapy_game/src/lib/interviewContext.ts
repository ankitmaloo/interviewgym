import type { UserMemorySummary } from "@/lib/memory/neo4j";

export type InterviewRolePostingContext = {
    id: string;
    title: string;
    company: string;
    location: string;
    url: string;
    source: string;
    summary: string;
    jobDescription: string;
    skills: string[];
};

export type InterviewRoleContext = {
    id: string;
    role: string;
    domain: string;
    aspiration: string;
    skillFocus: string[];
    notes: string;
    primaryPostingId: string | null;
    postings: InterviewRolePostingContext[];
};

export type BuiltInterviewContext = {
    roleContext: InterviewRoleContext | null;
    primaryPosting: InterviewRolePostingContext | null;
    contextualUpdate: string;
    dynamicVariables: Record<string, string | number | boolean>;
};

type BuildInterviewContextInput = {
    problemId: string;
    problemTitle: string;
    problemDescription: string;
    problemCategory: string;
    difficulty: string;
    roleContext: unknown;
    memorySummary: UserMemorySummary | null;
};

function normalizeSkills(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) =>
                typeof item === "string" ? item.trim().toLowerCase() : ""
            )
            .filter(Boolean)
            .filter((item, index, arr) => arr.indexOf(item) === index)
            .slice(0, 15);
    }

    if (typeof value === "string") {
        return value
            .split(/[,\n]+/)
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
            .filter((item, index, arr) => arr.indexOf(item) === index)
            .slice(0, 15);
    }

    return [];
}

function asString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function normalizePosting(value: unknown): InterviewRolePostingContext | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const input = value as Record<string, unknown>;
    const id = asString(input.id);
    const title = asString(input.title);
    const company = asString(input.company);
    const url = asString(input.url);

    if (!id || !title || !company || !url) {
        return null;
    }

    return {
        id,
        title,
        company,
        location: asString(input.location),
        url,
        source: asString(input.source),
        summary: asString(input.summary),
        jobDescription: asString(input.jobDescription),
        skills: normalizeSkills(input.skills),
    };
}

function normalizeRoleContext(value: unknown): InterviewRoleContext | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const input = value as Record<string, unknown>;
    const role = asString(input.role);
    const domain = asString(input.domain);
    const aspiration = asString(input.aspiration);
    if (!role || !domain || !aspiration) {
        return null;
    }

    const postings = Array.isArray(input.postings)
        ? input.postings
              .map((item) => normalizePosting(item))
              .filter((item): item is InterviewRolePostingContext => item !== null)
        : [];

    const primaryPostingIdRaw = asString(input.primaryPostingId);
    const primaryPostingId = primaryPostingIdRaw || null;

    return {
        id: asString(input.id),
        role,
        domain,
        aspiration,
        skillFocus: normalizeSkills(input.skillFocus),
        notes: asString(input.notes),
        primaryPostingId:
            primaryPostingId && postings.some((posting) => posting.id === primaryPostingId)
                ? primaryPostingId
                : null,
        postings,
    };
}

function pickPrimaryPosting(
    roleContext: InterviewRoleContext | null
): InterviewRolePostingContext | null {
    if (!roleContext || roleContext.postings.length === 0) {
        return null;
    }

    if (roleContext.primaryPostingId) {
        const primary = roleContext.postings.find(
            (posting) => posting.id === roleContext.primaryPostingId
        );
        if (primary) {
            return primary;
        }
    }

    return roleContext.postings[0] ?? null;
}

function truncate(value: string, maxLength: number): string {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized) return "";
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 3)}...`;
}

export function buildInterviewContext(
    input: BuildInterviewContextInput
): BuiltInterviewContext {
    const roleContext = normalizeRoleContext(input.roleContext);
    const primaryPosting = pickPrimaryPosting(roleContext);

    const postingSkills = primaryPosting ? primaryPosting.skills : [];
    const roleSkills = roleContext ? roleContext.skillFocus : [];
    const skillFocus = [...roleSkills, ...postingSkills]
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .filter((item, index, arr) => arr.indexOf(item) === index)
        .slice(0, 10);

    const strengths =
        input.memorySummary?.enabled && Array.isArray(input.memorySummary.strengths)
            ? input.memorySummary.strengths
                  .map((item) => item.metric.trim())
                  .filter(Boolean)
                  .slice(0, 3)
            : [];
    const weaknesses =
        input.memorySummary?.enabled && Array.isArray(input.memorySummary.weaknesses)
            ? input.memorySummary.weaknesses
                  .map((item) => item.metric.trim())
                  .filter(Boolean)
                  .slice(0, 4)
            : [];

    const contextualLines = [
        `Interview type: ${input.problemTitle} (${input.problemCategory}, ${input.difficulty}).`,
    ];

    if (roleContext) {
        contextualLines.push(
            `Target role: ${roleContext.role} in ${roleContext.domain}. Aspiration: ${roleContext.aspiration}.`
        );
        if (roleContext.notes) {
            contextualLines.push(`Role notes: ${truncate(roleContext.notes, 220)}`);
        }
    }

    if (primaryPosting) {
        contextualLines.push(
            `Primary opening: ${primaryPosting.title} at ${primaryPosting.company}.`
        );
        if (primaryPosting.jobDescription) {
            contextualLines.push(
                `JD details: ${truncate(primaryPosting.jobDescription, 420)}`
            );
        } else if (primaryPosting.summary) {
            contextualLines.push(
                `Opening summary: ${truncate(primaryPosting.summary, 280)}`
            );
        }
    }

    if (skillFocus.length > 0) {
        contextualLines.push(
            `Evaluate and probe these skills: ${skillFocus.join(", ")}.`
        );
    }

    if (weaknesses.length > 0) {
        contextualLines.push(
            `Candidate needs more evidence on: ${weaknesses.join(", ")}. Ask targeted follow-ups.`
        );
    }

    if (strengths.length > 0) {
        contextualLines.push(
            `Candidate strengths from history: ${strengths.join(", ")}. Raise the bar with depth questions.`
        );
    }

    contextualLines.push(
        `Primary objective: ask role-specific questions grounded in this opening and measure interview readiness.`
    );

    const contextualUpdate = contextualLines.join(" ");

    const dynamicVariables: Record<string, string | number | boolean> = {
        interview_problem_id: input.problemId,
        interview_problem_title: input.problemTitle,
        interview_difficulty: input.difficulty,
        interview_problem_category: input.problemCategory,
        interview_problem_description: truncate(input.problemDescription, 220),
    };

    if (roleContext) {
        dynamicVariables.interview_role = roleContext.role;
        dynamicVariables.interview_domain = roleContext.domain;
        dynamicVariables.interview_aspiration = truncate(roleContext.aspiration, 220);
        dynamicVariables.interview_role_notes = truncate(roleContext.notes, 220);
    }

    if (primaryPosting) {
        dynamicVariables.interview_opening_title = primaryPosting.title;
        dynamicVariables.interview_opening_company = primaryPosting.company;
        dynamicVariables.interview_opening_summary = truncate(
            primaryPosting.summary || primaryPosting.jobDescription,
            220
        );
    }

    if (skillFocus.length > 0) {
        dynamicVariables.interview_skill_focus = skillFocus.join(", ");
    }

    if (weaknesses.length > 0) {
        dynamicVariables.interview_memory_weaknesses = weaknesses.join(", ");
    }
    if (strengths.length > 0) {
        dynamicVariables.interview_memory_strengths = strengths.join(", ");
    }

    dynamicVariables.interview_contextual_update = truncate(contextualUpdate, 1500);

    return {
        roleContext,
        primaryPosting,
        contextualUpdate,
        dynamicVariables,
    };
}
