import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Save a completed session ──────────────────────────────────────────────
export const saveSession = mutation({
    args: {
        problemId: v.string(),
        problemTitle: v.string(),
        difficulty: v.string(),
        transcript: v.string(),
        evidence: v.any(),
        analysis: v.array(
            v.object({
                category: v.string(),
                metric: v.string(),
                score: v.number(),
                comments: v.string(),
            })
        ),
        overallScore: v.number(),
        duration: v.number(),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("sessions", {
            ...args,
            createdAt: Date.now(),
        });
        return id;
    },
});

// ── Get all sessions (newest first) ──────────────────────────────────────
export const listSessions = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("sessions").order("desc").collect();
    },
});

// ── Get a single session by ID ────────────────────────────────────────────
export const getSession = query({
    args: { id: v.id("sessions") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// ── Get sessions for a specific problem ──────────────────────────────────
export const getSessionsByProblem = query({
    args: { problemId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("sessions")
            .filter((q) => q.eq(q.field("problemId"), args.problemId))
            .order("desc")
            .collect();
    },
});

// ── Get dashboard stats ──────────────────────────────────────────────────
export const getDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        const sessions = await ctx.db.query("sessions").order("desc").collect();

        if (sessions.length === 0) {
            return {
                totalSessions: 0,
                avgScore: 0,
                totalPracticeTime: 0,
                recentSessions: [],
                weeklyData: [],
                categoryAverages: [],
                scoreOverTime: [],
            };
        }

        const totalSessions = sessions.length;
        const avgScore = Math.round(
            sessions.reduce((sum, s) => sum + s.overallScore, 0) / totalSessions
        );
        const totalPracticeTime = sessions.reduce((sum, s) => sum + s.duration, 0);

        // Recent 5 sessions
        const recentSessions = sessions.slice(0, 5).map((s) => ({
            id: s._id,
            problemId: s.problemId,
            problemTitle: s.problemTitle,
            difficulty: s.difficulty,
            overallScore: s.overallScore,
            duration: s.duration,
            createdAt: s.createdAt,
        }));

        // Category averages across all sessions
        const categoryMap: Record<string, { total: number; count: number }> = {};
        for (const session of sessions) {
            for (const item of session.analysis) {
                if (item.category === "RED_FLAGS") continue;
                if (!categoryMap[item.category]) {
                    categoryMap[item.category] = { total: 0, count: 0 };
                }
                categoryMap[item.category].total += item.score;
                categoryMap[item.category].count += 1;
            }
        }
        const categoryAverages = Object.entries(categoryMap).map(
            ([category, { total, count }]) => ({
                category,
                avgScore: Math.round((total / count) * 10) / 10,
            })
        );

        // Score over time (all sessions chronologically)
        const scoreOverTime = [...sessions].reverse().map((s, i) => ({
            session: i + 1,
            score: s.overallScore,
            problemTitle: s.problemTitle,
            date: new Date(s.createdAt).toLocaleDateString(),
        }));

        return {
            totalSessions,
            avgScore,
            totalPracticeTime,
            recentSessions,
            categoryAverages,
            scoreOverTime,
        };
    },
});
