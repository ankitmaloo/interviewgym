"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
    buildRolePosting,
    buildRoleTarget,
    loadRoleTargetsFromStorage,
    loadSelectedRoleTargetId,
    saveRoleTargetsToStorage,
    saveSelectedRoleTargetId,
    type RoleTarget,
    type RoleTargetStatus,
} from "@/lib/roleTargets";

type RoleFormState = {
    role: string;
    domain: string;
    aspiration: string;
    location: string;
    searchQuery: string;
    notes: string;
};

type PostingDraft = {
    title: string;
    company: string;
    location: string;
    url: string;
    source: string;
    summary: string;
};

type ScoutPosting = {
    title: string;
    company: string;
    location: string;
    url: string;
    source: string;
    summary: string;
};

type ScoutResponse = {
    ok: boolean;
    provider?: "yutori" | "fallback";
    providerNotes?: string;
    postings?: ScoutPosting[];
    rawResultsCount?: number;
    error?: string;
};

const emptyRoleForm: RoleFormState = {
    role: "",
    domain: "",
    aspiration: "",
    location: "",
    searchQuery: "",
    notes: "",
};

const emptyPostingDraft: PostingDraft = {
    title: "",
    company: "",
    location: "",
    url: "",
    source: "Yutori",
    summary: "",
};

const statusLabels: Record<RoleTargetStatus, string> = {
    active: "Active",
    paused: "Paused",
    archived: "Archived",
};

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
    }
    return `https://${trimmed}`;
}

export default function RolesPage() {
    const router = useRouter();

    const [authenticated, setAuthenticated] = useState(false);
    const [checking, setChecking] = useState(true);
    const [hydrated, setHydrated] = useState(false);

    const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
    const [targets, setTargets] = useState<RoleTarget[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [postingDrafts, setPostingDrafts] = useState<Record<string, PostingDraft>>({});
    const [scoutingRoleId, setScoutingRoleId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const auth = localStorage.getItem("iaso_ai_auth");
        if (auth !== "true") {
            router.push("/login");
        } else {
            setAuthenticated(true);
        }
        setChecking(false);
    }, [router]);

    useEffect(() => {
        if (!authenticated) return;

        const storedTargets = loadRoleTargetsFromStorage();
        setTargets(storedTargets);

        const storedSelected = loadSelectedRoleTargetId();
        if (storedSelected && storedTargets.some((target) => target.id === storedSelected)) {
            setSelectedRoleId(storedSelected);
        }

        setHydrated(true);
    }, [authenticated]);

    useEffect(() => {
        if (!hydrated) return;

        saveRoleTargetsToStorage(targets);

        if (selectedRoleId && !targets.some((target) => target.id === selectedRoleId)) {
            setSelectedRoleId(null);
            saveSelectedRoleTargetId(null);
        }
    }, [targets, hydrated, selectedRoleId]);

    const sortedTargets = useMemo(
        () => [...targets].sort((a, b) => b.updatedAt - a.updatedAt),
        [targets]
    );

    const selectedRole = useMemo(
        () => sortedTargets.find((target) => target.id === selectedRoleId) ?? null,
        [sortedTargets, selectedRoleId]
    );

    const handleCreateRoleTarget = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        if (!roleForm.role.trim() || !roleForm.domain.trim() || !roleForm.aspiration.trim()) {
            setErrorMessage("Role, domain, and aspiration are required.");
            return;
        }

        const newTarget = buildRoleTarget(roleForm);
        setTargets((prev) => [newTarget, ...prev]);
        setRoleForm(emptyRoleForm);
        setSelectedRoleId(newTarget.id);
        saveSelectedRoleTargetId(newTarget.id);
        setSuccessMessage(`Saved role target: ${newTarget.role}`);
    };

    const handleRoleStatusChange = (targetId: string, status: RoleTargetStatus) => {
        setTargets((prev) =>
            prev.map((target) =>
                target.id === targetId
                    ? {
                        ...target,
                        status,
                        updatedAt: Date.now(),
                    }
                    : target
            )
        );
    };

    const handleSetFocus = (targetId: string) => {
        setSelectedRoleId(targetId);
        saveSelectedRoleTargetId(targetId);
        setSuccessMessage("Selected role focus for upcoming practice sessions.");
    };

    const handleDeleteRoleTarget = (targetId: string) => {
        if (!window.confirm("Remove this role target and its saved postings?")) return;

        setTargets((prev) => prev.filter((target) => target.id !== targetId));
        if (selectedRoleId === targetId) {
            setSelectedRoleId(null);
            saveSelectedRoleTargetId(null);
        }

        setSuccessMessage("Role target removed.");
    };

    const handlePostingDraftChange = (
        targetId: string,
        field: keyof PostingDraft,
        value: string
    ) => {
        setPostingDrafts((prev) => ({
            ...prev,
            [targetId]: {
                ...(prev[targetId] || emptyPostingDraft),
                [field]: value,
            },
        }));
    };

    const handleAddPosting = (targetId: string) => {
        setErrorMessage(null);
        setSuccessMessage(null);

        const draft = postingDrafts[targetId] || emptyPostingDraft;
        if (!draft.title.trim() || !draft.company.trim() || !draft.url.trim()) {
            setErrorMessage("Posting title, company, and URL are required.");
            return;
        }

        const posting = buildRolePosting({
            ...draft,
            url: normalizeUrl(draft.url),
        });

        setTargets((prev) =>
            prev.map((target) =>
                target.id === targetId
                    ? {
                        ...target,
                        postings: [posting, ...target.postings],
                        updatedAt: Date.now(),
                    }
                    : target
            )
        );

        setPostingDrafts((prev) => ({
            ...prev,
            [targetId]: emptyPostingDraft,
        }));
        setSuccessMessage("Job posting added to this role target.");
    };

    const handleScoutRole = async (target: RoleTarget) => {
        setErrorMessage(null);
        setSuccessMessage(null);
        setScoutingRoleId(target.id);

        try {
            const response = await fetch("/api/roles/scout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    role: target.role,
                    domain: target.domain,
                    aspiration: target.aspiration,
                    location: target.location,
                    searchQuery: target.searchQuery,
                    notes: target.notes,
                    maxResults: 8,
                }),
            });

            const payload = (await response
                .json()
                .catch(() => null)) as ScoutResponse | null;

            if (!response.ok || !payload?.ok) {
                setErrorMessage(
                    payload?.error || `Scout request failed (${response.status}).`
                );
                return;
            }

            const incomingPostings = Array.isArray(payload.postings)
                ? payload.postings
                : [];

            if (incomingPostings.length === 0) {
                const providerLabel =
                    payload.provider === "yutori" ? "Yutori" : "Tavily fallback";
                setSuccessMessage(
                    `Scout completed using ${providerLabel}, but no postings were returned.`
                );
                return;
            }

            let addedCount = 0;
            let duplicateCount = 0;

            setTargets((prev) =>
                prev.map((currentTarget) => {
                    if (currentTarget.id !== target.id) return currentTarget;

                    const seenUrls = new Set(
                        currentTarget.postings.map((posting) =>
                            normalizeUrl(posting.url).toLowerCase()
                        )
                    );

                    const additions = incomingPostings.reduce<
                        ReturnType<typeof buildRolePosting>[]
                    >((acc, candidate) => {
                        const title = candidate.title?.trim() || "";
                        const company = candidate.company?.trim() || "";
                        const normalized = normalizeUrl(candidate.url || "");
                        const key = normalized.toLowerCase();

                        if (!title || !company || !normalized) {
                            return acc;
                        }

                        if (seenUrls.has(key)) {
                            duplicateCount += 1;
                            return acc;
                        }

                        seenUrls.add(key);

                        acc.push(
                            buildRolePosting({
                                title,
                                company,
                                location:
                                    candidate.location?.trim() ||
                                    currentTarget.location ||
                                    "",
                                url: normalized,
                                source:
                                    candidate.source?.trim() ||
                                    (payload.provider === "yutori"
                                        ? "Yutori"
                                        : "Tavily via Yutori"),
                                summary: candidate.summary?.trim() || "",
                            })
                        );
                        return acc;
                    }, []);

                    addedCount = additions.length;

                    if (addedCount === 0) {
                        return currentTarget;
                    }

                    return {
                        ...currentTarget,
                        postings: [...additions, ...currentTarget.postings],
                        updatedAt: Date.now(),
                    };
                })
            );

            const providerLabel =
                payload.provider === "yutori" ? "Yutori" : "Tavily fallback";

            if (addedCount === 0) {
                setSuccessMessage(
                    `Scout completed with ${providerLabel}. All returned postings were already saved.`
                );
                return;
            }

            const duplicateNote =
                duplicateCount > 0
                    ? ` Skipped ${duplicateCount} duplicate posting${duplicateCount === 1 ? "" : "s"}.`
                    : "";
            const providerNote = payload.providerNotes
                ? ` ${payload.providerNotes}`
                : "";

            setSuccessMessage(
                `Added ${addedCount} posting${addedCount === 1 ? "" : "s"} using ${providerLabel}.${duplicateNote}${providerNote}`
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setErrorMessage(message);
        } finally {
            setScoutingRoleId(null);
        }
    };

    const openPracticeForRole = (targetId: string) => {
        handleSetFocus(targetId);
        router.push(`/practice?focusRole=${encodeURIComponent(targetId)}`);
    };

    if (checking || !authenticated) {
        return (
            <div className="bg-gradient-animated flex min-h-screen items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary-light)] border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="bg-gradient-animated min-h-screen p-6 sm:p-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <header className="glass-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Role Scout Workflow</h1>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                            Save target jobs by role or domain, then track delivered postings before interview practice.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => router.push("/")}
                            className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--surface-light)]"
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => router.push("/practice")}
                            className="cursor-pointer rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-light)]"
                        >
                            Practice Scenarios
                        </button>
                    </div>
                </header>

                {errorMessage && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {errorMessage}
                    </div>
                )}

                {successMessage && (
                    <div className="rounded-xl border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/10 px-4 py-3 text-sm text-[var(--accent-green)]">
                        {successMessage}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-5">
                    <form
                        onSubmit={handleCreateRoleTarget}
                        className="glass-card flex flex-col gap-4 p-6 lg:col-span-3"
                    >
                        <div>
                            <h2 className="text-lg font-semibold text-white">Create Role Target</h2>
                            <p className="text-xs text-[var(--text-muted)]">
                                Configure what Yutori should scout so practice aligns with real job demand.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                                Role *
                                <input
                                    value={roleForm.role}
                                    onChange={(event) =>
                                        setRoleForm((prev) => ({ ...prev, role: event.target.value }))
                                    }
                                    placeholder="Senior Backend Engineer"
                                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)]"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                                Domain *
                                <input
                                    value={roleForm.domain}
                                    onChange={(event) =>
                                        setRoleForm((prev) => ({ ...prev, domain: event.target.value }))
                                    }
                                    placeholder="AI Infrastructure"
                                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)]"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)] md:col-span-2">
                                Aspiration *
                                <input
                                    value={roleForm.aspiration}
                                    onChange={(event) =>
                                        setRoleForm((prev) => ({ ...prev, aspiration: event.target.value }))
                                    }
                                    placeholder="Lead distributed systems projects in a high-growth startup"
                                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)]"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                                Preferred Location
                                <input
                                    value={roleForm.location}
                                    onChange={(event) =>
                                        setRoleForm((prev) => ({ ...prev, location: event.target.value }))
                                    }
                                    placeholder="Remote (US)"
                                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)]"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                                Search Query
                                <input
                                    value={roleForm.searchQuery}
                                    onChange={(event) =>
                                        setRoleForm((prev) => ({ ...prev, searchQuery: event.target.value }))
                                    }
                                    placeholder="site:linkedin.com/jobs kubernetes platform engineer"
                                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)]"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)] md:col-span-2">
                                Notes for Yutori
                                <textarea
                                    value={roleForm.notes}
                                    onChange={(event) =>
                                        setRoleForm((prev) => ({ ...prev, notes: event.target.value }))
                                    }
                                    placeholder="Prioritize companies with strong mentorship and system design depth."
                                    rows={3}
                                    className="resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)]"
                                />
                            </label>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="cursor-pointer rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                            >
                                Save Role Target
                            </button>
                        </div>
                    </form>

                    <div className="glass-card flex flex-col gap-3 p-6 lg:col-span-2">
                        <h2 className="text-lg font-semibold text-white">Workflow</h2>
                        <div className="space-y-3 text-sm text-[var(--text-muted)]">
                            <p>1. Define the role and domain you want to target.</p>
                            <p>2. Add concrete postings as Yutori delivers matches.</p>
                            <p>3. Mark one role as focus and jump into practice sessions.</p>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text-muted)]">
                            Current focus:
                            <span className="ml-2 font-semibold text-white">
                                {selectedRole ? selectedRole.role : "Not set"}
                            </span>
                        </div>
                    </div>
                </div>

                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Roles To Practice For</h2>
                        <span className="text-xs text-[var(--text-muted)]">{sortedTargets.length} saved</span>
                    </div>

                    {sortedTargets.length === 0 ? (
                        <div className="glass-card p-8 text-center text-sm text-[var(--text-muted)]">
                            No role targets yet. Create one above to start scouting job postings.
                        </div>
                    ) : (
                        sortedTargets.map((target) => {
                            const postingDraft = postingDrafts[target.id] || emptyPostingDraft;

                            return (
                                <div
                                    key={target.id}
                                    className={`glass-card p-5 ${selectedRoleId === target.id ? "border-[var(--primary-light)]" : ""}`}
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">{target.role}</h3>
                                            <p className="text-sm text-[var(--text-muted)]">{target.domain}</p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <select
                                                value={target.status}
                                                onChange={(event) =>
                                                    handleRoleStatusChange(
                                                        target.id,
                                                        event.target.value as RoleTargetStatus
                                                    )
                                                }
                                                className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-white outline-none transition-colors focus:border-[var(--primary-light)]"
                                            >
                                                <option value="active">{statusLabels.active}</option>
                                                <option value="paused">{statusLabels.paused}</option>
                                                <option value="archived">{statusLabels.archived}</option>
                                            </select>

                                            <button
                                                onClick={() => handleSetFocus(target.id)}
                                                className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-[var(--border-hover)]"
                                            >
                                                {selectedRoleId === target.id ? "Focused" : "Set Focus"}
                                            </button>

                                            <button
                                                onClick={() => openPracticeForRole(target.id)}
                                                className="cursor-pointer rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--primary-light)]"
                                            >
                                                Practice
                                            </button>

                                            <button
                                                onClick={() => void handleScoutRole(target)}
                                                disabled={scoutingRoleId === target.id}
                                                className="cursor-pointer rounded-lg border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {scoutingRoleId === target.id
                                                    ? "Scouting..."
                                                    : "Scout (Tavily + Yutori)"}
                                            </button>

                                            <button
                                                onClick={() => handleDeleteRoleTarget(target.id)}
                                                className="cursor-pointer rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 text-xs text-[var(--text-muted)] md:grid-cols-3">
                                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                                            <div className="mb-1 uppercase tracking-wider">Aspiration</div>
                                            <div className="text-sm text-white">{target.aspiration}</div>
                                        </div>
                                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                                            <div className="mb-1 uppercase tracking-wider">Location</div>
                                            <div className="text-sm text-white">{target.location || "Any"}</div>
                                        </div>
                                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                                            <div className="mb-1 uppercase tracking-wider">Search Query</div>
                                            <div className="text-sm text-white">{target.searchQuery || "Not set"}</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-white">Delivered Postings</h4>
                                            <span className="text-xs text-[var(--text-muted)]">
                                                {target.postings.length} saved
                                            </span>
                                        </div>

                                        {target.postings.length === 0 ? (
                                            <p className="mb-4 text-xs text-[var(--text-muted)]">
                                                No postings attached yet.
                                            </p>
                                        ) : (
                                            <div className="mb-4 space-y-2">
                                                {target.postings.map((posting) => (
                                                    <div
                                                        key={posting.id}
                                                        className="rounded-lg border border-[var(--border)] bg-black/10 p-3"
                                                    >
                                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                            <div>
                                                                <p className="text-sm font-medium text-white">{posting.title}</p>
                                                                <p className="text-xs text-[var(--text-muted)]">
                                                                    {posting.company}
                                                                    {posting.location ? ` · ${posting.location}` : ""}
                                                                    {posting.source ? ` · ${posting.source}` : ""}
                                                                </p>
                                                            </div>
                                                            <a
                                                                href={posting.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-xs font-semibold text-[var(--primary-light)] hover:underline"
                                                            >
                                                                Open posting
                                                            </a>
                                                        </div>
                                                        {posting.summary && (
                                                            <p className="mt-2 text-xs text-[var(--text-muted)]">
                                                                {posting.summary}
                                                            </p>
                                                        )}
                                                        <p className="mt-1 text-[10px] text-[var(--text-muted)]/80">
                                                            Added {formatDate(posting.addedAt)}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="grid gap-2 md:grid-cols-2">
                                            <input
                                                value={postingDraft.title}
                                                onChange={(event) =>
                                                    handlePostingDraftChange(
                                                        target.id,
                                                        "title",
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Posting title"
                                                className="rounded-lg border border-[var(--border)] bg-black/10 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)]"
                                            />
                                            <input
                                                value={postingDraft.company}
                                                onChange={(event) =>
                                                    handlePostingDraftChange(
                                                        target.id,
                                                        "company",
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Company"
                                                className="rounded-lg border border-[var(--border)] bg-black/10 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)]"
                                            />
                                            <input
                                                value={postingDraft.location}
                                                onChange={(event) =>
                                                    handlePostingDraftChange(
                                                        target.id,
                                                        "location",
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Location"
                                                className="rounded-lg border border-[var(--border)] bg-black/10 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)]"
                                            />
                                            <input
                                                value={postingDraft.source}
                                                onChange={(event) =>
                                                    handlePostingDraftChange(
                                                        target.id,
                                                        "source",
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Source"
                                                className="rounded-lg border border-[var(--border)] bg-black/10 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)]"
                                            />
                                            <input
                                                value={postingDraft.url}
                                                onChange={(event) =>
                                                    handlePostingDraftChange(
                                                        target.id,
                                                        "url",
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Posting URL"
                                                className="rounded-lg border border-[var(--border)] bg-black/10 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)] md:col-span-2"
                                            />
                                            <textarea
                                                value={postingDraft.summary}
                                                onChange={(event) =>
                                                    handlePostingDraftChange(
                                                        target.id,
                                                        "summary",
                                                        event.target.value
                                                    )
                                                }
                                                rows={2}
                                                placeholder="Why this posting is a good practice target"
                                                className="resize-none rounded-lg border border-[var(--border)] bg-black/10 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--primary-light)] md:col-span-2"
                                            />
                                        </div>

                                        <div className="mt-3 flex justify-end">
                                            <button
                                                onClick={() => handleAddPosting(target.id)}
                                                className="cursor-pointer rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-400"
                                            >
                                                Add Posting
                                            </button>
                                        </div>
                                    </div>

                                    <p className="mt-3 text-[11px] text-[var(--text-muted)]/80">
                                        Updated {formatDate(target.updatedAt)}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </section>
            </div>
        </div>
    );
}
