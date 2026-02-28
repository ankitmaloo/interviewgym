import { NextRequest, NextResponse } from "next/server";
import { getProblemById } from "@/lib/problems";
import {
    createElevenLabsInterviewSessionConfig,
    isInterviewDifficulty,
} from "@/lib/integrations/elevenlabs";
import { buildInterviewContext } from "@/lib/interviewContext";
import { getUserMemorySummary } from "@/lib/memory/neo4j";
import { normalizeUserId } from "@/lib/userIdentity";

export const runtime = "nodejs";

type SessionBody = {
    problemId: string;
    difficulty: string;
    userId?: string | null;
    roleContext?: unknown;
};

function parseBody(value: unknown): SessionBody | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const payload = value as Record<string, unknown>;
    if (
        typeof payload.problemId !== "string" ||
        typeof payload.difficulty !== "string"
    ) {
        return null;
    }

    return {
        problemId: payload.problemId,
        difficulty: payload.difficulty.toLowerCase(),
        userId:
            typeof payload.userId === "string" || payload.userId === null
                ? payload.userId
                : undefined,
        roleContext: payload.roleContext,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = parseBody(await request.json());
        if (!body) {
            return NextResponse.json(
                {
                    ok: false,
                    provider: "elevenlabs",
                    error: "Invalid payload. Required fields: problemId, difficulty.",
                },
                { status: 400 }
            );
        }

        if (!isInterviewDifficulty(body.difficulty)) {
            return NextResponse.json(
                {
                    ok: false,
                    provider: "elevenlabs",
                    error: "Invalid difficulty. Expected easy, medium, or hard.",
                },
                { status: 400 }
            );
        }

        const problem = getProblemById(body.problemId);
        if (!problem) {
            return NextResponse.json(
                {
                    ok: false,
                    provider: "elevenlabs",
                    error: `Problem ${body.problemId} was not found.`,
                },
                { status: 404 }
            );
        }

        const config = await createElevenLabsInterviewSessionConfig({
            problemId: body.problemId,
            difficulty: body.difficulty,
        });

        const normalizedUserId = normalizeUserId(body.userId);
        let memorySummary = null;
        try {
            memorySummary = await getUserMemorySummary(normalizedUserId);
        } catch (error) {
            console.warn(
                "[voice/elevenlabs/session] memory summary unavailable:",
                error
            );
        }

        const interviewContext = buildInterviewContext({
            problemId: body.problemId,
            problemTitle: problem.title,
            problemDescription: problem.description,
            problemCategory: problem.category,
            difficulty: body.difficulty,
            roleContext: body.roleContext,
            memorySummary,
        });

        return NextResponse.json({
            ok: true,
            provider: "elevenlabs",
            problemId: body.problemId,
            difficulty: body.difficulty,
            userId: normalizedUserId,
            dynamicVariables: interviewContext.dynamicVariables,
            contextualUpdate: interviewContext.contextualUpdate,
            roleContext: interviewContext.roleContext,
            primaryOpening: interviewContext.primaryPosting,
            memoryEnabled: memorySummary?.enabled ?? false,
            ...config,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[voice/elevenlabs/session]", message);

        const status = message.startsWith("No interviewer agent configured.")
            ? 400
            : 500;

        return NextResponse.json(
            {
                ok: false,
                provider: "elevenlabs",
                error: message,
            },
            { status }
        );
    }
}
