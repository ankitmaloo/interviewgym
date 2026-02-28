import { hydrateServerEnv } from "@/lib/serverEnv";

function readConfig() {
    hydrateServerEnv(["MODULATE_"]);
    const apiUrl = process.env.MODULATE_API_URL;
    const apiKey = process.env.MODULATE_API_KEY;

    if (!apiUrl || !apiKey) {
        return null;
    }

    return { apiUrl, apiKey };
}

export type ModulateUploadResult = {
    enabled: boolean;
    provider: "modulate";
    transcript?: string;
    responseText?: string;
    audioUrl?: string;
    message?: string;
    raw?: unknown;
};

function parseUploadPayload(payload: unknown): ModulateUploadResult {
    if (!payload || typeof payload !== "object") {
        return {
            enabled: true,
            provider: "modulate",
        };
    }

    const data = payload as Record<string, unknown>;
    const transcript =
        typeof data.transcript === "string"
            ? data.transcript
            : typeof data.transcription === "string"
                ? data.transcription
                : undefined;

    const responseText =
        typeof data.responseText === "string"
            ? data.responseText
            : typeof data.response === "string"
                ? data.response
                : typeof data.answer === "string"
                    ? data.answer
                    : typeof data.text === "string"
                        ? data.text
                        : undefined;

    const audioUrl =
        typeof data.audioUrl === "string"
            ? data.audioUrl
            : typeof data.audio_url === "string"
                ? data.audio_url
                : undefined;

    const message =
        typeof data.message === "string"
            ? data.message
            : responseText
                ? "Modulate processed your uploaded turn."
                : undefined;

    return {
        enabled: true,
        provider: "modulate",
        transcript,
        responseText,
        audioUrl,
        message,
        raw: payload,
    };
}

export async function uploadInterviewAudioToModulate(input: {
    audioFile: File;
    userId: string;
    problemId: string;
    problemTitle: string;
    difficulty: string;
    focusRole?: string | null;
}): Promise<ModulateUploadResult> {
    const config = readConfig();
    if (!config) {
        throw new Error(
            "Modulate is not configured. Set MODULATE_API_URL and MODULATE_API_KEY."
        );
    }

    const formData = new FormData();
    formData.append(
        "upload_file",
        input.audioFile,
        input.audioFile.name || `turn-${Date.now()}.webm`
    );
    formData.append("user_id", input.userId);
    formData.append("problem_id", input.problemId);
    formData.append("problem_title", input.problemTitle);
    formData.append("difficulty", input.difficulty);
    if (input.focusRole) {
        formData.append("focus_role", input.focusRole);
    }

    const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "X-API-Key": config.apiKey,
        },
        body: formData,
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Modulate upload failed (${response.status}): ${body}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        const payload = await response.json();
        return parseUploadPayload(payload);
    }

    const textBody = await response.text();
    return {
        enabled: true,
        provider: "modulate",
        message: "Modulate processed your uploaded turn.",
        responseText: textBody || undefined,
    };
}
