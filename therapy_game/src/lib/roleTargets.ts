export type RoleTargetStatus = "active" | "paused" | "archived";

export type RolePosting = {
    id: string;
    title: string;
    company: string;
    location: string;
    url: string;
    source: string;
    summary: string;
    addedAt: number;
};

export type RoleTarget = {
    id: string;
    role: string;
    domain: string;
    aspiration: string;
    location: string;
    searchQuery: string;
    notes: string;
    status: RoleTargetStatus;
    postings: RolePosting[];
    createdAt: number;
    updatedAt: number;
};

const ROLE_TARGETS_KEY = "iaso_ai_role_targets_v1";
const SELECTED_ROLE_TARGET_KEY = "iaso_ai_selected_role_target_v1";

function hasBrowserStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function normalizePosting(value: unknown): RolePosting | null {
    if (!isRecord(value)) return null;

    if (
        typeof value.id !== "string" ||
        typeof value.title !== "string" ||
        typeof value.company !== "string" ||
        typeof value.location !== "string" ||
        typeof value.url !== "string" ||
        typeof value.source !== "string" ||
        typeof value.summary !== "string" ||
        typeof value.addedAt !== "number"
    ) {
        return null;
    }

    return {
        id: value.id,
        title: value.title,
        company: value.company,
        location: value.location,
        url: value.url,
        source: value.source,
        summary: value.summary,
        addedAt: value.addedAt,
    };
}

function normalizeRoleTarget(value: unknown): RoleTarget | null {
    if (!isRecord(value)) return null;

    if (
        typeof value.id !== "string" ||
        typeof value.role !== "string" ||
        typeof value.domain !== "string" ||
        typeof value.aspiration !== "string" ||
        typeof value.location !== "string" ||
        typeof value.searchQuery !== "string" ||
        typeof value.notes !== "string" ||
        typeof value.status !== "string" ||
        typeof value.createdAt !== "number" ||
        typeof value.updatedAt !== "number" ||
        !Array.isArray(value.postings)
    ) {
        return null;
    }

    if (value.status !== "active" && value.status !== "paused" && value.status !== "archived") {
        return null;
    }

    const postings = value.postings
        .map((posting) => normalizePosting(posting))
        .filter((posting): posting is RolePosting => posting !== null);

    return {
        id: value.id,
        role: value.role,
        domain: value.domain,
        aspiration: value.aspiration,
        location: value.location,
        searchQuery: value.searchQuery,
        notes: value.notes,
        status: value.status,
        postings,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
    };
}

export function generateLocalId(prefix: string): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function loadRoleTargetsFromStorage(): RoleTarget[] {
    if (!hasBrowserStorage()) return [];

    const raw = window.localStorage.getItem(ROLE_TARGETS_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((item) => normalizeRoleTarget(item))
            .filter((target): target is RoleTarget => target !== null)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
        return [];
    }
}

export function saveRoleTargetsToStorage(targets: RoleTarget[]): void {
    if (!hasBrowserStorage()) return;
    window.localStorage.setItem(ROLE_TARGETS_KEY, JSON.stringify(targets));
}

export function loadSelectedRoleTargetId(): string | null {
    if (!hasBrowserStorage()) return null;
    return window.localStorage.getItem(SELECTED_ROLE_TARGET_KEY);
}

export function saveSelectedRoleTargetId(roleTargetId: string | null): void {
    if (!hasBrowserStorage()) return;

    if (!roleTargetId) {
        window.localStorage.removeItem(SELECTED_ROLE_TARGET_KEY);
        return;
    }

    window.localStorage.setItem(SELECTED_ROLE_TARGET_KEY, roleTargetId);
}

export function buildRoleTarget(input: {
    role: string;
    domain: string;
    aspiration: string;
    location?: string;
    searchQuery?: string;
    notes?: string;
}): RoleTarget {
    const now = Date.now();

    return {
        id: generateLocalId("role"),
        role: input.role.trim(),
        domain: input.domain.trim(),
        aspiration: input.aspiration.trim(),
        location: (input.location || "").trim(),
        searchQuery: (input.searchQuery || "").trim(),
        notes: (input.notes || "").trim(),
        status: "active",
        postings: [],
        createdAt: now,
        updatedAt: now,
    };
}

export function buildRolePosting(input: {
    title: string;
    company: string;
    location?: string;
    url: string;
    source?: string;
    summary?: string;
}): RolePosting {
    return {
        id: generateLocalId("posting"),
        title: input.title.trim(),
        company: input.company.trim(),
        location: (input.location || "").trim(),
        url: input.url.trim(),
        source: (input.source || "Yutori").trim(),
        summary: (input.summary || "").trim(),
        addedAt: Date.now(),
    };
}
