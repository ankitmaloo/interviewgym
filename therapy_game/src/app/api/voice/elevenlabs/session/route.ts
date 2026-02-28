import { NextRequest, NextResponse } from "next/server";
import { getProblemById } from "@/lib/problems";
import {
    createElevenLabsInterviewSessionConfig,
    isInterviewDifficulty,
} from "@/lib/integrations/elevenlabs";

export const runtime = "nodejs";

type SessionBody = {
    problemId: string;
    difficulty: string;
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

        if (!getProblemById(body.problemId)) {
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

        return NextResponse.json({
            ok: true,
            provider: "elevenlabs",
            problemId: body.problemId,
            difficulty: body.difficulty,
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
