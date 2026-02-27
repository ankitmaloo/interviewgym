import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    sessions: defineTable({
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
        duration: v.number(), // seconds
        createdAt: v.number(), // timestamp ms
    }),
});
