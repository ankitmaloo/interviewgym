import { NextRequest, NextResponse } from "next/server";
import { uploadInterviewAudioToModulate } from "@/lib/integrations/modulate";
import { analyzeInterviewSentimentWithYutori } from "@/lib/integrations/yutori";

export const runtime = "nodejs";

function readString(value: FormDataEntryValue | null): string {
    return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const uploadFile = formData.get("upload_file");

        if (!uploadFile || !(uploadFile instanceof File)) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Missing file. Provide `upload_file` in multipart form-data.",
                },
                { status: 400 }
            );
        }

        const userId = readString(formData.get("userId"));
        const problemId = readString(formData.get("problemId"));
        const problemTitle = readString(formData.get("problemTitle"));
        const difficulty = readString(formData.get("difficulty"));
        const focusRole = readString(formData.get("focusRole"));
        const focusDomain = readString(formData.get("focusDomain"));
        const focusAspiration = readString(formData.get("focusAspiration"));

        if (!userId || !problemId || !problemTitle || !difficulty) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Missing required fields. Include userId, problemId, problemTitle, and difficulty.",
                },
                { status: 400 }
            );
        }

        const result = await uploadInterviewAudioToModulate({
            audioFile: uploadFile,
            userId,
            problemId,
            problemTitle,
            difficulty,
            focusRole: focusRole || null,
        });

        const transcriptForSentiment = result.transcript ?? "";
        const responseForSentiment = result.responseText ?? "";
        const sentiment =
            transcriptForSentiment || responseForSentiment
                ? await analyzeInterviewSentimentWithYutori({
                      transcript: transcriptForSentiment,
                      responseText: responseForSentiment,
                      roleContext: {
                          role: focusRole || undefined,
                          domain: focusDomain || undefined,
                          aspiration: focusAspiration || undefined,
                          difficulty,
                          problemTitle,
                      },
                  })
                : null;

        return NextResponse.json({
            ok: true,
            ...result,
            sentiment,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[voice/upload]", message);

        return NextResponse.json(
            {
                ok: false,
                enabled: false,
                provider: "modulate",
                error: message,
            },
            { status: 500 }
        );
    }
}
