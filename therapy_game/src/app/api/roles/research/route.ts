import { NextRequest, NextResponse } from "next/server";
import { tavilySearch } from "@/lib/integrations/tavily";
import { researchRoleWithYutori } from "@/lib/integrations/yutori";

export const runtime = "nodejs";

type ResearchBody = {
    role: string;
    domain: string;
    aspiration: string;
};

function parseBody(value: unknown): ResearchBody | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const payload = value as Record<string, unknown>;
    if (
        typeof payload.role !== "string" ||
        typeof payload.domain !== "string" ||
        typeof payload.aspiration !== "string"
    ) {
        return null;
    }

    return {
        role: payload.role.trim(),
        domain: payload.domain.trim(),
        aspiration: payload.aspiration.trim(),
    };
}

function buildQuery(body: ResearchBody): string {
    return [body.role, body.domain, body.aspiration, "interview expectations", "skills"]
        .filter((item) => item.length > 0)
        .join(" ");
}

export async function POST(request: NextRequest) {
    try {
        const body = parseBody(await request.json());
        if (!body) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Invalid payload. Required fields: role, domain, aspiration.",
                },
                { status: 400 }
            );
        }

        const query = buildQuery(body);
        const tavily = await tavilySearch({
            query,
            maxResults: 6,
        });

        const brief = await researchRoleWithYutori({
            role: body.role,
            domain: body.domain,
            aspiration: body.aspiration,
            tavilyResults: tavily.results,
        });

        return NextResponse.json({
            ok: true,
            query,
            provider: brief.provider,
            roleBrief: brief,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[roles/research]", message);
        return NextResponse.json(
            {
                ok: false,
                error: message,
            },
            { status: 500 }
        );
    }
}
