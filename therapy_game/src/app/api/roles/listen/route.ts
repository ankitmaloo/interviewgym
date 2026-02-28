import { NextRequest, NextResponse } from "next/server";
import { tavilySearch } from "@/lib/integrations/tavily";
import {
    curatePostingsWithYutori,
    type RoleScoutInput,
} from "@/lib/integrations/yutori";

export const runtime = "nodejs";

type ListenRole = RoleScoutInput & {
    roleId: string;
    maxResults?: number;
};

type ListenBody = {
    roles: ListenRole[];
    maxResults?: number;
};

function normalizeSkillFocus(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) =>
                typeof item === "string" ? item.trim().toLowerCase() : ""
            )
            .filter(Boolean)
            .slice(0, 15);
    }

    if (typeof value === "string") {
        return value
            .split(/[,\n]+/)
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 15);
    }

    return [];
}

function parseRole(value: unknown, globalMaxResults: number): ListenRole | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const input = value as Record<string, unknown>;

    if (
        typeof input.roleId !== "string" ||
        typeof input.role !== "string" ||
        typeof input.domain !== "string" ||
        typeof input.aspiration !== "string"
    ) {
        return null;
    }

    const maxResults = Number(input.maxResults);

    return {
        roleId: input.roleId,
        role: input.role,
        domain: input.domain,
        aspiration: input.aspiration,
        skillFocus: normalizeSkillFocus(input.skillFocus),
        location: typeof input.location === "string" ? input.location : "",
        searchQuery: typeof input.searchQuery === "string" ? input.searchQuery : "",
        notes: typeof input.notes === "string" ? input.notes : "",
        maxResults:
            Number.isFinite(maxResults) && maxResults > 0
                ? Math.min(maxResults, 12)
                : globalMaxResults,
    };
}

function parseBody(value: unknown): ListenBody | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const input = value as Record<string, unknown>;
    if (!Array.isArray(input.roles)) {
        return null;
    }

    const maxResults = Number(input.maxResults);
    const normalizedMaxResults =
        Number.isFinite(maxResults) && maxResults > 0
            ? Math.min(maxResults, 12)
            : 8;

    const roles = input.roles
        .map((item) => parseRole(item, normalizedMaxResults))
        .filter((item): item is ListenRole => item !== null);

    if (roles.length === 0) {
        return null;
    }

    return {
        roles,
        maxResults: normalizedMaxResults,
    };
}

function buildSearchQuery(input: ListenRole): string {
    const parts = [
        input.searchQuery?.trim(),
        `${input.role} ${input.domain} jobs`,
        input.skillFocus && input.skillFocus.length > 0
            ? `required skills: ${input.skillFocus.join(", ")}`
            : "",
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
                    ok: false,
                    error:
                        "Invalid payload. Required fields: roles[] with roleId, role, domain, aspiration.",
                },
                { status: 400 }
            );
        }

        const roleResults = await Promise.all(
            body.roles.map(async (role) => {
                const query = buildSearchQuery(role);
                if (!query) {
                    return {
                        roleId: role.roleId,
                        ok: false,
                        error: "Search query cannot be empty.",
                    };
                }

                try {
                    const tavily = await tavilySearch({
                        query,
                        maxResults: role.maxResults,
                    });

                    const yutori = await curatePostingsWithYutori({
                        roleContext: role,
                        tavilyResults: tavily.results,
                    });

                    return {
                        roleId: role.roleId,
                        ok: true,
                        provider: yutori.provider,
                        providerNotes: yutori.notes,
                        query,
                        postings: yutori.postings,
                        rawResultsCount: tavily.results.length,
                    };
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : String(error);
                    return {
                        roleId: role.roleId,
                        ok: false,
                        error: message,
                    };
                }
            })
        );

        return NextResponse.json({
            ok: true,
            roleCount: body.roles.length,
            roles: roleResults,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[roles/listen]", message);

        return NextResponse.json(
            {
                ok: false,
                error: message,
            },
            { status: 500 }
        );
    }
}
