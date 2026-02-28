import { hydrateServerEnv } from "@/lib/serverEnv";

export type InterviewDifficulty = "easy" | "medium" | "hard";

export type ElevenLabsSessionConfig = {
    connectionType: "websocket";
    agentId: string;
    signedUrl?: string;
    mode: "signed-url" | "public-agent";
    configuredKey: string;
    warning?: string;
};

const VALID_DIFFICULTIES = new Set<InterviewDifficulty>([
    "easy",
    "medium",
    "hard",
]);

const LOCKED_INTERVIEWER_AGENT_BY_PROBLEM: Record<string, string> = {
    "2": "agent_8801kjgt3d1rekg84s1ej4ywxcjq",
};
const DEFAULT_FALLBACK_INTERVIEWER_AGENT =
    "agent_8801kjgt3d1rekg84s1ej4ywxcjq";

function readEnvValue(key: string): string {
    const value = process.env[key];
    return typeof value === "string" ? value.trim() : "";
}

function readApiKey(): string {
    return (
        readEnvValue("ELEVENLABS_API_KEY") ||
        readEnvValue("XI_API_KEY") ||
        readEnvValue("ELEVEN_API_KEY")
    );
}

function getCandidateAgentKeys(
    problemId: string,
    difficulty: InterviewDifficulty
): string[] {
    const suffix = difficulty.toUpperCase();

    return [
        `ELEVENLABS_INTERVIEWER_AGENT_${problemId}_${suffix}`,
        `NEXT_PUBLIC_INTERVIEWER_AGENT_${problemId}_${suffix}`,
        `NEXT_PUBLIC_AGENT_${problemId}_${suffix}`,
        `ELEVENLABS_INTERVIEWER_AGENT_${suffix}`,
        `NEXT_PUBLIC_INTERVIEWER_AGENT_${suffix}`,
        `NEXT_PUBLIC_AGENT_${suffix}`,
        "ELEVENLABS_INTERVIEWER_AGENT_DEFAULT",
        "NEXT_PUBLIC_INTERVIEWER_AGENT_DEFAULT",
        "ELEVENLABS_AGENT_ID",
        "NEXT_PUBLIC_ELEVENLABS_AGENT_ID",
        "NEXT_PUBLIC_AGENT_ID",
    ];
}

export function isInterviewDifficulty(
    value: string
): value is InterviewDifficulty {
    return VALID_DIFFICULTIES.has(value as InterviewDifficulty);
}

export function resolveInterviewerAgentId(input: {
    problemId: string;
    difficulty: InterviewDifficulty;
}): { agentId: string; key: string } | null {
    const lockedAgentId = LOCKED_INTERVIEWER_AGENT_BY_PROBLEM[input.problemId];
    if (lockedAgentId) {
        return {
            agentId: lockedAgentId,
            key: `LOCKED_INTERVIEWER_AGENT_${input.problemId}`,
        };
    }

    hydrateServerEnv([
        "ELEVENLABS_",
        "NEXT_PUBLIC_INTERVIEWER_AGENT_",
        "NEXT_PUBLIC_AGENT_",
        "NEXT_PUBLIC_ELEVENLABS_",
    ]);

    for (const key of getCandidateAgentKeys(input.problemId, input.difficulty)) {
        const value = readEnvValue(key);
        if (value) {
            return { agentId: value, key };
        }
    }

    return {
        agentId: DEFAULT_FALLBACK_INTERVIEWER_AGENT,
        key: "DEFAULT_FALLBACK_INTERVIEWER_AGENT",
    };
}

async function fetchSignedWebsocketUrl(input: {
    agentId: string;
    apiKey: string;
}): Promise<string> {
    const url = new URL(
        "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url"
    );
    url.searchParams.set("agent_id", input.agentId);

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
            "xi-api-key": input.apiKey,
        },
        cache: "no-store",
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(
            `ElevenLabs signed URL request failed (${response.status}): ${body}`
        );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const signedUrl =
        typeof payload.signed_url === "string"
            ? payload.signed_url
            : typeof payload.signedUrl === "string"
              ? payload.signedUrl
              : "";

    if (!signedUrl) {
        throw new Error(
            "ElevenLabs signed URL response did not include `signed_url`."
        );
    }

    return signedUrl;
}

export async function createElevenLabsInterviewSessionConfig(input: {
    problemId: string;
    difficulty: InterviewDifficulty;
}): Promise<ElevenLabsSessionConfig> {
    const resolved = resolveInterviewerAgentId(input);
    if (!resolved) {
        const suffix = input.difficulty.toUpperCase();
        throw new Error(
            `No interviewer agent configured. Set ELEVENLABS_INTERVIEWER_AGENT_${input.problemId}_${suffix} (recommended) or NEXT_PUBLIC_INTERVIEWER_AGENT_${input.problemId}_${suffix}.`
        );
    }

    const apiKey = readApiKey();
    if (!apiKey) {
        return {
            connectionType: "websocket",
            mode: "public-agent",
            agentId: resolved.agentId,
            configuredKey: resolved.key,
        };
    }

    try {
        const signedUrl = await fetchSignedWebsocketUrl({
            agentId: resolved.agentId,
            apiKey,
        });

        return {
            connectionType: "websocket",
            mode: "signed-url",
            agentId: resolved.agentId,
            signedUrl,
            configuredKey: resolved.key,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            connectionType: "websocket",
            mode: "public-agent",
            agentId: resolved.agentId,
            configuredKey: resolved.key,
            warning: `Signed URL setup failed, falling back to public-agent mode: ${message}`,
        };
    }
}
