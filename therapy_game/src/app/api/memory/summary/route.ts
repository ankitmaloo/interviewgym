import { NextRequest, NextResponse } from "next/server";
import { getUserMemorySummary } from "@/lib/memory/neo4j";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get("userId");
        const summary = await getUserMemorySummary(userId);
        return NextResponse.json(summary);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[memory/summary]", message);

        return NextResponse.json(
            {
                enabled: false,
                strengths: [],
                weaknesses: [],
                recentInterviews: [],
                error: message,
            },
            { status: 500 }
        );
    }
}
