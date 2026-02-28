import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type VoiceSessionBody = {
    userId: string;
    problemId: string;
    problemTitle: string;
    difficulty: string;
    focusRole?: string | null;
};

function parseBody(value: unknown): VoiceSessionBody | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const input = value as Record<string, unknown>;
    if (
        typeof input.userId !== "string" ||
        typeof input.problemId !== "string" ||
        typeof input.problemTitle !== "string" ||
        typeof input.difficulty !== "string"
    ) {
        return null;
    }

    return {
        userId: input.userId,
        problemId: input.problemId,
        problemTitle: input.problemTitle,
        difficulty: input.difficulty,
        focusRole:
            typeof input.focusRole === "string" || input.focusRole === null
                ? input.focusRole
                : undefined,
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
                    error:
                        "Invalid payload. Required fields: userId, problemId, problemTitle, difficulty.",
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            ok: false,
            provider: "elevenlabs",
            error:
                "Legacy endpoint. Use /api/voice/elevenlabs/session for realtime websocket interviews. Modulate is upload-only via /api/voice/upload.",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[voice/session]", message);

        return NextResponse.json(
            {
                ok: false,
                provider: "elevenlabs",
                error: message,
            },
            { status: 500 }
        );
    }
}
