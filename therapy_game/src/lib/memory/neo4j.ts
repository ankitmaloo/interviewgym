import neo4j, { Driver } from "neo4j-driver";
import { hydrateServerEnv } from "@/lib/serverEnv";
import { DEFAULT_USER_ID, normalizeUserId } from "@/lib/userIdentity";

const STRENGTH_THRESHOLD = 7;
const WEAKNESS_THRESHOLD = 5;

type MemoryClassification = "STRENGTH" | "WEAKNESS" | "NEUTRAL";

type Neo4jConfig = {
    uri: string;
    username: string;
    password: string;
    database: string;
};

export type AnalysisMetricInput = {
    category: string;
    metric: string;
    score: number;
    comments: string;
};

export type UpsertMemoryInput = {
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
};

export type MemoryInsight = {
    metric: string;
    category: string;
    avgScore: number;
    samples: number;
    lastUpdatedAt: number;
    lastFeedback: string | null;
};

export type InterviewMemoryEntry = {
    sessionId: string;
    problemId: string;
    problemTitle: string;
    difficulty: string;
    overallScore: number;
    duration: number;
    createdAt: number;
};

export type UserMemorySummary = {
    enabled: boolean;
    userId: string;
    strengths: MemoryInsight[];
    weaknesses: MemoryInsight[];
    recentInterviews: InterviewMemoryEntry[];
    message?: string;
};

let cachedDriver: Driver | null = null;

function readConfig(): Neo4jConfig | null {
    hydrateServerEnv(["NEO4J_"]);

    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !username || !password) {
        return null;
    }

    return {
        uri,
        username,
        password,
        database: process.env.NEO4J_DATABASE ?? "neo4j",
    };
}

function getDriverAndConfig(): { driver: Driver | null; config: Neo4jConfig | null } {
    const config = readConfig();

    if (!config) {
        return { driver: null, config: null };
    }

    if (!cachedDriver) {
        cachedDriver = neo4j.driver(
            config.uri,
            neo4j.auth.basic(config.username, config.password),
            {
                maxConnectionPoolSize: 20,
            }
        );
    }

    return { driver: cachedDriver, config };
}

function toNumber(value: unknown): number {
    if (value === null || value === undefined) {
        return 0;
    }

    if (neo4j.isInt(value)) {
        return value.toNumber();
    }

    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

function toStringOrNull(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

function classifyScore(score: number): MemoryClassification {
    if (score >= STRENGTH_THRESHOLD) {
        return "STRENGTH";
    }

    if (score <= WEAKNESS_THRESHOLD) {
        return "WEAKNESS";
    }

    return "NEUTRAL";
}

function normalizeMetrics(metrics: AnalysisMetricInput[]) {
    return metrics
        .filter((item) => item.category !== "RED_FLAGS")
        .map((item) => {
            const score = Number(item.score);
            const safeScore = Number.isFinite(score)
                ? Math.min(Math.max(score, 0), 10)
                : 0;

            return {
                metric: item.metric?.trim() || "Unknown Metric",
                category: item.category?.trim() || "General",
                comments: item.comments?.trim() || "",
                score: safeScore,
                classification: classifyScore(safeScore),
            };
        })
        .filter((item) => item.metric.length > 0);
}

export async function upsertUserInterviewMemory(input: UpsertMemoryInput): Promise<{
    enabled: boolean;
    userId: string;
    storedMetrics: number;
    message?: string;
}> {
    const userId = normalizeUserId(input.userId ?? DEFAULT_USER_ID);
    const { driver, config } = getDriverAndConfig();

    if (!driver || !config) {
        return {
            enabled: false,
            userId,
            storedMetrics: 0,
            message:
                "Neo4j memory is disabled. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD to enable it.",
        };
    }

    const createdAt =
        typeof input.createdAt === "number" && Number.isFinite(input.createdAt)
            ? input.createdAt
            : Date.now();
    const metrics = normalizeMetrics(input.analysis);

    const session = driver.session({ database: config.database });

    try {
        await session.executeWrite(async (tx) => {
            await tx.run(
                `
                MERGE (u:User {id: $userId})
                ON CREATE SET u.createdAt = $createdAt
                SET u.lastSeenAt = $createdAt

                MERGE (s:InterviewSession {id: $sessionId})
                ON CREATE SET s.createdAt = $createdAt
                SET s.problemId = $problemId,
                    s.problemTitle = $problemTitle,
                    s.difficulty = $difficulty,
                    s.transcript = $transcript,
                    s.overallScore = $overallScore,
                    s.duration = $duration

                MERGE (u)-[:COMPLETED]->(s)
                `,
                {
                    userId,
                    sessionId: input.sessionId,
                    problemId: input.problemId,
                    problemTitle: input.problemTitle,
                    difficulty: input.difficulty,
                    transcript: input.transcript,
                    overallScore: input.overallScore,
                    duration: input.duration,
                    createdAt,
                }
            );

            if (metrics.length > 0) {
                await tx.run(
                    `
                    MATCH (s:InterviewSession {id: $sessionId})
                    UNWIND $metrics AS item
                    MERGE (skill:InterviewSkill {name: item.metric, category: item.category})
                    ON CREATE SET skill.createdAt = $createdAt
                    MERGE (s)-[e:EVIDENCES {metric: item.metric, category: item.category}]->(skill)
                    SET e.score = item.score,
                        e.feedback = item.comments,
                        e.classification = item.classification,
                        e.createdAt = $createdAt
                    `,
                    {
                        sessionId: input.sessionId,
                        metrics,
                        createdAt,
                    }
                );
            }

            await tx.run(
                `
                MATCH (u:User {id: $userId})
                OPTIONAL MATCH (u)-[old:GOOD_AT|NEEDS_WORK]->(:InterviewSkill)
                DELETE old
                `,
                { userId }
            );

            await tx.run(
                `
                MATCH (u:User {id: $userId})-[:COMPLETED]->(:InterviewSession)-[e:EVIDENCES]->(skill:InterviewSkill)
                WITH u, skill, avg(e.score) AS avgScore, count(e) AS samples, max(e.createdAt) AS lastUpdatedAt
                WHERE avgScore >= $strengthThreshold
                MERGE (u)-[g:GOOD_AT]->(skill)
                SET g.avgScore = avgScore,
                    g.samples = samples,
                    g.lastUpdatedAt = lastUpdatedAt
                `,
                {
                    userId,
                    strengthThreshold: STRENGTH_THRESHOLD,
                }
            );

            await tx.run(
                `
                MATCH (u:User {id: $userId})-[:COMPLETED]->(:InterviewSession)-[e:EVIDENCES]->(skill:InterviewSkill)
                WITH u, skill, avg(e.score) AS avgScore, count(e) AS samples, max(e.createdAt) AS lastUpdatedAt
                WHERE avgScore <= $weaknessThreshold
                MERGE (u)-[w:NEEDS_WORK]->(skill)
                SET w.avgScore = avgScore,
                    w.samples = samples,
                    w.lastUpdatedAt = lastUpdatedAt
                `,
                {
                    userId,
                    weaknessThreshold: WEAKNESS_THRESHOLD,
                }
            );
        });

        return {
            enabled: true,
            userId,
            storedMetrics: metrics.length,
        };
    } finally {
        await session.close();
    }
}

export async function getUserMemorySummary(
    inputUserId: string | null | undefined
): Promise<UserMemorySummary> {
    const userId = normalizeUserId(inputUserId);
    const { driver, config } = getDriverAndConfig();

    if (!driver || !config) {
        return {
            enabled: false,
            userId,
            strengths: [],
            weaknesses: [],
            recentInterviews: [],
            message:
                "Neo4j memory is disabled. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD to enable it.",
        };
    }

    const session = driver.session({ database: config.database });

    try {
        const userCheck = await session.run(
            `MATCH (u:User {id: $userId}) RETURN u.id AS id LIMIT 1`,
            { userId }
        );

        if (userCheck.records.length === 0) {
            return {
                enabled: true,
                userId,
                strengths: [],
                weaknesses: [],
                recentInterviews: [],
            };
        }

        const strengthsResult = await session.run(
            `
            MATCH (u:User {id: $userId})-[r:GOOD_AT]->(skill:InterviewSkill)
            OPTIONAL MATCH (u)-[:COMPLETED]->(:InterviewSession)-[e:EVIDENCES]->(skill)
            WITH skill, r, e
            ORDER BY e.createdAt DESC
            WITH skill, r, collect(e)[0] AS latestEvidence
            RETURN skill.name AS metric,
                   skill.category AS category,
                   r.avgScore AS avgScore,
                   r.samples AS samples,
                   r.lastUpdatedAt AS lastUpdatedAt,
                   latestEvidence.feedback AS lastFeedback
            ORDER BY r.avgScore DESC, r.samples DESC
            LIMIT 5
            `,
            { userId }
        );

        const weaknessesResult = await session.run(
            `
            MATCH (u:User {id: $userId})-[r:NEEDS_WORK]->(skill:InterviewSkill)
            OPTIONAL MATCH (u)-[:COMPLETED]->(:InterviewSession)-[e:EVIDENCES]->(skill)
            WITH skill, r, e
            ORDER BY e.createdAt DESC
            WITH skill, r, collect(e)[0] AS latestEvidence
            RETURN skill.name AS metric,
                   skill.category AS category,
                   r.avgScore AS avgScore,
                   r.samples AS samples,
                   r.lastUpdatedAt AS lastUpdatedAt,
                   latestEvidence.feedback AS lastFeedback
            ORDER BY r.avgScore ASC, r.samples DESC
            LIMIT 5
            `,
            { userId }
        );

        const recentResult = await session.run(
            `
            MATCH (:User {id: $userId})-[:COMPLETED]->(s:InterviewSession)
            RETURN s.id AS sessionId,
                   s.problemId AS problemId,
                   s.problemTitle AS problemTitle,
                   s.difficulty AS difficulty,
                   s.overallScore AS overallScore,
                   s.duration AS duration,
                   s.createdAt AS createdAt
            ORDER BY s.createdAt DESC
            LIMIT 5
            `,
            { userId }
        );

        const strengths: MemoryInsight[] = strengthsResult.records.map((record) => ({
            metric: String(record.get("metric")),
            category: String(record.get("category")),
            avgScore: toNumber(record.get("avgScore")),
            samples: toNumber(record.get("samples")),
            lastUpdatedAt: toNumber(record.get("lastUpdatedAt")),
            lastFeedback: toStringOrNull(record.get("lastFeedback")),
        }));

        const weaknesses: MemoryInsight[] = weaknessesResult.records.map((record) => ({
            metric: String(record.get("metric")),
            category: String(record.get("category")),
            avgScore: toNumber(record.get("avgScore")),
            samples: toNumber(record.get("samples")),
            lastUpdatedAt: toNumber(record.get("lastUpdatedAt")),
            lastFeedback: toStringOrNull(record.get("lastFeedback")),
        }));

        const recentInterviews: InterviewMemoryEntry[] = recentResult.records.map(
            (record) => ({
                sessionId: String(record.get("sessionId")),
                problemId: String(record.get("problemId")),
                problemTitle: String(record.get("problemTitle")),
                difficulty: String(record.get("difficulty")),
                overallScore: toNumber(record.get("overallScore")),
                duration: toNumber(record.get("duration")),
                createdAt: toNumber(record.get("createdAt")),
            })
        );

        return {
            enabled: true,
            userId,
            strengths,
            weaknesses,
            recentInterviews,
        };
    } finally {
        await session.close();
    }
}
