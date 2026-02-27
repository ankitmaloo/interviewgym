"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { problems, type Difficulty } from "@/lib/problems";

/* ─── Icons ─── */
const Icons = {
    menu: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    ),
    close: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    dashboard: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    ),
    analytics: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    ),
    settings: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    logout: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    ),
    heart: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
    ),
    practice: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    arrow: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    ),
    clock: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
};

const navItems = [
    { icon: Icons.dashboard, label: "Dashboard", href: "/" },
    { icon: Icons.practice, label: "Practice", href: "/practice", active: true },
    { icon: Icons.analytics, label: "Analytics", href: "/analytics" },
];

const difficultyMeta: Record<
    Difficulty,
    { label: string; color: string; dotColor: string }
> = {
    easy: {
        label: "Easy",
        color: "text-[var(--accent-green)]",
        dotColor: "bg-[var(--accent-green)]",
    },
    medium: {
        label: "Medium",
        color: "text-[#fbbf24]",
        dotColor: "bg-[#fbbf24]",
    },
    hard: {
        label: "Hard",
        color: "text-[#f472b6]",
        dotColor: "bg-[#f472b6]",
    },
};

export default function PracticeListPage() {
    const router = useRouter();
    const [authenticated, setAuthenticated] = useState(false);
    const [checking, setChecking] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    // Per-card difficulty selection: { problemId: difficulty }
    const [selectedDifficulty, setSelectedDifficulty] = useState<
        Record<string, Difficulty>
    >(() => {
        const defaults: Record<string, Difficulty> = {};
        problems.forEach((p) => (defaults[p.id] = "easy"));
        return defaults;
    });

    useEffect(() => {
        const auth = localStorage.getItem("iaso_ai_auth");
        if (auth !== "true") {
            router.push("/login");
        } else {
            setAuthenticated(true);
        }
        setChecking(false);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("iaso_ai_auth");
        router.push("/login");
    };

    if (checking || !authenticated) {
        return (
            <div className="bg-gradient-animated flex min-h-screen items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary-light)] border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="bg-gradient-animated relative flex min-h-screen overflow-hidden">
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ─── Sidebar ─── */}
            <aside
                className={`fixed top-0 left-0 z-40 flex h-full flex-col border-r border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl transition-all duration-300 ease-in-out ${sidebarOpen ? "w-64" : "w-0 lg:w-20"
                    } overflow-hidden`}
            >
                <div className="flex h-16 items-center justify-between px-5">
                    <div
                        className={`flex items-center gap-3 transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-100"
                            }`}
                    >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]">
                            {Icons.heart}
                        </div>
                        {sidebarOpen && (
                            <span className="whitespace-nowrap text-lg font-bold text-white">
                                IASO AI
                            </span>
                        )}
                    </div>
                    {sidebarOpen && (
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="cursor-pointer text-[var(--text-muted)] transition-colors hover:text-white lg:hidden"
                        >
                            {Icons.close}
                        </button>
                    )}
                </div>
                <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => item.href && router.push(item.href)}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${item.active
                                ? "bg-[var(--primary)]/20 text-[var(--primary-light)]"
                                : "text-[var(--text-muted)] hover:bg-[var(--surface-light)] hover:text-white"
                                }`}
                        >
                            <span className="flex-shrink-0">{item.icon}</span>
                            {sidebarOpen && (
                                <span className="whitespace-nowrap">{item.label}</span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="border-t border-[var(--border)] p-3">
                    <button
                        onClick={handleLogout}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                        <span className="flex-shrink-0">{Icons.logout}</span>
                        {sidebarOpen && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* ─── Main Content ─── */}
            <main
                className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"
                    }`}
            >
                {/* Top bar */}
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-6 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="cursor-pointer rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-light)] hover:text-white"
                        >
                            {sidebarOpen ? Icons.close : Icons.menu}
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-white">
                                Practice Scenarios
                            </h1>
                            <p className="text-xs text-[var(--text-muted)]">
                                Choose a coaching problem and difficulty level
                            </p>
                        </div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-sm font-bold text-white">
                        A
                    </div>
                </header>

                {/* Content */}
                <div className="p-6">
                    {/* Problem cards grid */}
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {problems.map((problem, idx) => {
                            const diff = selectedDifficulty[problem.id] || "easy";
                            const meta = difficultyMeta[diff];

                            return (
                                <div
                                    key={problem.id}
                                    className="glass-card group flex flex-col p-6 transition-all duration-500 hover:-translate-y-2 hover:border-[var(--border-hover)] hover:shadow-[0_0_40px_rgba(124,92,191,0.15)]"
                                    style={{
                                        animation: `fadeInUp 0.6s ease-out ${0.1 * (idx + 1)}s forwards`,
                                        opacity: 0,
                                    }}
                                >
                                    {/* Header */}
                                    <div className="mb-4 flex items-start justify-between">
                                        <div
                                            className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${problem.color} text-2xl shadow-lg transition-transform duration-300 group-hover:scale-110`}
                                        >
                                            {problem.icon}
                                        </div>
                                        <span className="rounded-md bg-[var(--surface-light)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                                            {problem.category}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <h3 className="mb-2 text-lg font-semibold text-white">
                                        {problem.title}
                                    </h3>
                                    <p className="mb-5 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                                        {problem.description}
                                    </p>

                                    {/* Difficulty selector */}
                                    <div className="mb-4">
                                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                                            Difficulty
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={diff}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDifficulty((prev) => ({
                                                        ...prev,
                                                        [problem.id]: e.target.value as Difficulty,
                                                    }));
                                                }}
                                                className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 pr-10 text-sm font-medium text-white transition-all duration-200 focus:border-[var(--primary-light)] focus:ring-1 focus:ring-[var(--glow)] focus:outline-none hover:border-[var(--border-hover)]"
                                            >
                                                <option value="easy">🟢 Easy</option>
                                                <option value="medium">🟡 Medium</option>
                                                <option value="hard">🔴 Hard</option>
                                            </select>
                                            {/* Custom dropdown arrow */}
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                <svg
                                                    className="h-4 w-4 text-[var(--text-muted)]"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 9l-7 7-7-7"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                                {Icons.clock}
                                                {problem.estimatedTime[diff]}
                                            </span>
                                            <span
                                                className={`flex items-center gap-1.5 text-xs font-medium ${meta.color}`}
                                            >
                                                <span
                                                    className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dotColor}`}
                                                />
                                                {meta.label}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() =>
                                                router.push(
                                                    `/practice/${problem.id}?difficulty=${diff}`
                                                )
                                            }
                                            className="flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--primary)]/20 px-3 py-1.5 text-xs font-semibold text-[var(--primary-light)] transition-all duration-200 hover:bg-[var(--primary)]/30 hover:scale-105"
                                        >
                                            Start
                                            {Icons.arrow}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
