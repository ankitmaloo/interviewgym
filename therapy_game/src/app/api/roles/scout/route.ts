import { NextRequest, NextResponse } from "next/server";
import { tavilySearch } from "@/lib/integrations/tavily";
import {
    curatePostingsWithYutori,
    type RoleScoutInput,
} from "@/lib/integrations/yutori";

export const runtime = "nodejs";

type ScoutRequest = RoleScoutInput & {
    maxResults?: number;
};

function parseBody(value: unknown): ScoutRequest | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const input = value as Record<string, unknown>;
    if (
        typeof input.role !== "string" ||
        typeof input.domain !== "string" ||
        typeof input.aspiration !== "string"
    ) {
        return null;
    }

    return {
        role: input.role,
        domain: input.domain,
        aspiration: input.aspiration,
        location: typeof input.location === "string" ? input.location : "",
        searchQuery: typeof input.searchQuery === "string" ? input.searchQuery : "",
        notes: typeof input.notes === "string" ? input.notes : "",
        maxResults:
            typeof input.maxResults === "number" && Number.isFinite(input.maxResults)
                ? input.maxResults
                : 8,
    };
}

function buildSearchQuery(input: ScoutRequest): string {
    const parts = [
        input.searchQuery?.trim(),
        `${input.role} ${input.domain} jobs`,
        input.location?.trim(),
        input.notes?.trim(),
    ].filter((item): item is string => Boolean(item));

    return parts.join(" | ");
}

export async function POST(request: NextRequest) {
    try {
        const raw = await request.json();
        const body = parseBody(raw);

        if (!body) {
            return NextResponse.json(
                {
                    error:
                        "Invalid payload. Required fields: role, domain, aspiration.",
                },
                { status: 400 }
            );
        }

        const query = buildSearchQuery(body);
        if (!query) {
            return NextResponse.json(
                { error: "Search query cannot be empty." },
                { status: 400 }
            );
        }

        const tavily = await tavilySearch({
            query,
            maxResults: body.maxResults,
        });

        const yutori = await curatePostingsWithYutori({
            roleContext: body,
            tavilyResults: tavily.results,
        });

        return NextResponse.json({
            ok: true,
            query,
            tavilyAnswer: tavily.answer,
            provider: yutori.provider,
            providerNotes: yutori.notes,
            postings: yutori.postings,
            rawResultsCount: tavily.results.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[roles/scout]", message);

        return NextResponse.json(
            {
                ok: false,
                error: message,
            },
            { status: 500 }
        );
    }
}
