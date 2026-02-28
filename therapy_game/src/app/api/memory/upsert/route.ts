import { NextRequest, NextResponse } from "next/server";
import {
    AnalysisMetricInput,
    upsertUserInterviewMemory,
} from "@/lib/memory/neo4j";

export const runtime = "nodejs";

type UpsertBody = {
    userId?: string | null;
    sessionId: string;
    problemId: string;
    problemTitle: string;
    difficulty: string;
    transcript: string;
    overallScore: number;
    duration: number;
    createdAt?: number;
    analysis: AnalysisMetricInput[];
    focusRole?: string;
    focusDomain?: string;
    focusAspiration?: string;
    focusSkills?: string[];
    focusNotes?: string;
    focusPostingTitle?: string;
    focusPostingCompany?: string;
    focusPostingUrl?: string;
    focusPostingSummary?: string;
    focusPostingJobDescription?: string;
};

function normalizeString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeSkills(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) =>
                typeof item === "string" ? item.trim().toLowerCase() : ""
            )
            .filter(Boolean)
            .slice(0, 20);
    }

    if (typeof value === "string") {
        return value
            .split(/[,\n]+/)
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 20);
    }

    return [];
}

function isMetric(value: unknown): value is AnalysisMetricInput {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
        typeof candidate.category === "string" &&
        typeof candidate.metric === "string" &&
        (typeof candidate.score === "number" ||
            (typeof candidate.score === "string" &&
                Number.isFinite(Number(candidate.score)))) &&
        typeof candidate.comments === "string"
    );
}

function parseBody(body: unknown): UpsertBody | null {
    if (!body || typeof body !== "object") {
        return null;
    }

    const payload = body as Record<string, unknown>;

    if (
        typeof payload.sessionId !== "string" ||
        typeof payload.problemId !== "string" ||
        typeof payload.problemTitle !== "string" ||
        typeof payload.difficulty !== "string" ||
        typeof payload.transcript !== "string"
    ) {
        return null;
    }

    const overallScore = Number(payload.overallScore);
    const duration = Number(payload.duration);

    if (!Number.isFinite(overallScore) || !Number.isFinite(duration)) {
        return null;
    }

    const analysis = Array.isArray(payload.analysis)
        ? payload.analysis.filter(isMetric).map((item) => ({
              category: item.category,
              metric: item.metric,
              score: Number(item.score),
              comments: item.comments,
          }))
        : [];

    const createdAt =
        typeof payload.createdAt === "number" && Number.isFinite(payload.createdAt)
            ? payload.createdAt
            : undefined;

    return {
        userId:
            typeof payload.userId === "string" || payload.userId === null
                ? payload.userId
                : undefined,
        sessionId: payload.sessionId,
        problemId: payload.problemId,
        problemTitle: payload.problemTitle,
        difficulty: payload.difficulty,
        transcript: payload.transcript,
        overallScore,
        duration,
        createdAt,
        analysis,
        focusRole: normalizeString(payload.focusRole),
        focusDomain: normalizeString(payload.focusDomain),
        focusAspiration: normalizeString(payload.focusAspiration),
        focusSkills: normalizeSkills(payload.focusSkills),
        focusNotes: normalizeString(payload.focusNotes),
        focusPostingTitle: normalizeString(payload.focusPostingTitle),
        focusPostingCompany: normalizeString(payload.focusPostingCompany),
        focusPostingUrl: normalizeString(payload.focusPostingUrl),
        focusPostingSummary: normalizeString(payload.focusPostingSummary),
        focusPostingJobDescription: normalizeString(
            payload.focusPostingJobDescription
        ),
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = parseBody(body);

        if (!parsed) {
            return NextResponse.json(
                {
                    error:
                        "Invalid payload. Required fields: sessionId, problemId, problemTitle, difficulty, transcript, overallScore, duration.",
                },
                { status: 400 }
            );
        }

        const result = await upsertUserInterviewMemory(parsed);

        return NextResponse.json({
            ok: true,
            ...result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[memory/upsert]", message);

        return NextResponse.json(
            {
                ok: false,
                error: message,
            },
            { status: 500 }
        );
    }
}
