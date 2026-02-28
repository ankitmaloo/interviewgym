export type SessionAnalysisItem = {
    category: string;
    metric: string;
    score: number;
    comments: string;
};

export type SessionRecord = {
    id: string;
    problemId: string;
    problemTitle: string;
    difficulty: string;
    transcript: string;
    evidence: unknown;
    analysis: SessionAnalysisItem[];
    overallScore: number;
    duration: number;
    createdAt: number;
};

export type DashboardStats = {
    totalSessions: number;
    avgScore: number;
    totalPracticeTime: number;
    recentSessions: Array<{
        id: string;
        problemId: string;
        problemTitle: string;
        difficulty: string;
        overallScore: number;
        duration: number;
        createdAt: number;
    }>;
    categoryAverages: Array<{
        category: string;
        avgScore: number;
    }>;
    scoreOverTime: Array<{
        session: number;
        score: number;
        problemTitle: string;
        date: string;
    }>;
};

const SESSIONS_KEY = "iaso_ai_sessions_v1";

function hasBrowserStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function normalizeAnalysisItem(value: unknown): SessionAnalysisItem | null {
    if (!isRecord(value)) return null;

    if (
        typeof value.category !== "string" ||
        typeof value.metric !== "string" ||
        typeof value.score !== "number" ||
        typeof value.comments !== "string"
    ) {
        return null;
    }

    return {
        category: value.category,
        metric: value.metric,
        score: value.score,
        comments: value.comments,
    };
}

function normalizeSession(value: unknown): SessionRecord | null {
    if (!isRecord(value)) return null;

    if (
        typeof value.id !== "string" ||
        typeof value.problemId !== "string" ||
        typeof value.problemTitle !== "string" ||
        typeof value.difficulty !== "string" ||
        typeof value.transcript !== "string" ||
        typeof value.overallScore !== "number" ||
        typeof value.duration !== "number" ||
        typeof value.createdAt !== "number" ||
        !Array.isArray(value.analysis)
    ) {
        return null;
    }

    const analysis = value.analysis
        .map((item) => normalizeAnalysisItem(item))
        .filter((item): item is SessionAnalysisItem => item !== null);

    return {
        id: value.id,
        problemId: value.problemId,
        problemTitle: value.problemTitle,
        difficulty: value.difficulty,
        transcript: value.transcript,
        evidence: value.evidence,
        analysis,
        overallScore: value.overallScore,
        duration: value.duration,
        createdAt: value.createdAt,
    };
}

export function generateSessionId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `session_${crypto.randomUUID()}`;
    }

    return `session_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function loadSessionsFromStorage(): SessionRecord[] {
    if (!hasBrowserStorage()) return [];

    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((item) => normalizeSession(item))
            .filter((session): session is SessionRecord => session !== null)
            .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
        return [];
    }
}

export function saveSessionsToStorage(sessions: SessionRecord[]): void {
    if (!hasBrowserStorage()) return;
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function saveSessionToStorage(input: {
    problemId: string;
    problemTitle: string;
    difficulty: string;
    transcript: string;
    evidence: unknown;
    analysis: SessionAnalysisItem[];
    overallScore: number;
    duration: number;
    createdAt?: number;
}): string {
    const sessions = loadSessionsFromStorage();
    const id = generateSessionId();

    const record: SessionRecord = {
        id,
        problemId: input.problemId,
        problemTitle: input.problemTitle,
        difficulty: input.difficulty,
        transcript: input.transcript,
        evidence: input.evidence,
        analysis: input.analysis,
        overallScore: input.overallScore,
        duration: input.duration,
        createdAt: input.createdAt ?? Date.now(),
    };

    saveSessionsToStorage([record, ...sessions]);
    return id;
}

export function getSessionById(sessionId: string): SessionRecord | null {
    return loadSessionsFromStorage().find((session) => session.id === sessionId) ?? null;
}

export function buildDashboardStats(sessions: SessionRecord[]): DashboardStats {
    if (sessions.length === 0) {
        return {
            totalSessions: 0,
            avgScore: 0,
            totalPracticeTime: 0,
            recentSessions: [],
            categoryAverages: [],
            scoreOverTime: [],
        };
    }

    const totalSessions = sessions.length;
    const avgScore = Math.round(
        sessions.reduce((sum, session) => sum + session.overallScore, 0) / totalSessions
    );
    const totalPracticeTime = sessions.reduce(
        (sum, session) => sum + session.duration,
        0
    );

    const recentSessions = sessions.slice(0, 5).map((session) => ({
        id: session.id,
        problemId: session.problemId,
        problemTitle: session.problemTitle,
        difficulty: session.difficulty,
        overallScore: session.overallScore,
        duration: session.duration,
        createdAt: session.createdAt,
    }));

    const categoryTotals: Record<string, { total: number; count: number }> = {};
    for (const session of sessions) {
        for (const item of session.analysis) {
            if (item.category === "RED_FLAGS") continue;
            if (!categoryTotals[item.category]) {
                categoryTotals[item.category] = { total: 0, count: 0 };
            }
            categoryTotals[item.category].total += item.score;
            categoryTotals[item.category].count += 1;
        }
    }

    const categoryAverages = Object.entries(categoryTotals).map(
        ([category, values]) => ({
            category,
            avgScore: Math.round((values.total / values.count) * 10) / 10,
        })
    );

    const scoreOverTime = [...sessions]
        .reverse()
        .map((session, index) => ({
            session: index + 1,
            score: session.overallScore,
            problemTitle: session.problemTitle,
            date: new Date(session.createdAt).toLocaleDateString(),
        }));

    return {
        totalSessions,
        avgScore,
        totalPracticeTime,
        recentSessions,
        categoryAverages,
        scoreOverTime,
    };
}

export function getDashboardStatsFromStorage(): DashboardStats {
    return buildDashboardStats(loadSessionsFromStorage());
}
