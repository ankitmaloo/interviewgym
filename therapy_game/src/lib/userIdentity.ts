export const DEFAULT_USER_ID = "demo-user";

export function normalizeUserId(userId: string | null | undefined): string {
    const value = userId?.trim();
    return value ? value : DEFAULT_USER_ID;
}

export function buildUserIdFromEmail(email: string): string {
    const normalized = email
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return normalizeUserId(normalized ? `user-${normalized}` : null);
}

export function getClientUserId(): string {
    if (typeof window === "undefined") {
        return DEFAULT_USER_ID;
    }

    try {
        const stored = window.localStorage.getItem("iaso_ai_user_id");
        return normalizeUserId(stored);
    } catch {
        return DEFAULT_USER_ID;
    }
}
