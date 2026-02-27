"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { getProblemById } from "@/lib/problems";
import type { Id } from "../../../../../convex/_generated/dataModel";

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
    back: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
    ),
    flag: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
    ),
};

const navItems = [
    { icon: Icons.dashboard, label: "Dashboard", href: "/" },
    { icon: Icons.practice, label: "Practice", href: "/practice", active: true },
    { icon: Icons.analytics, label: "Analytics", href: "/analytics" },
];

type AnalysisItem = {
    category: string;
    metric: string;
    score: number;
    comments: string;
};

const categoryColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    "Establishes & Maintains Agreements": {
        bg: "bg-[#7c5cbf]/10",
        border: "border-[#7c5cbf]/30",
        text: "text-[#a78bfa]",
        icon: "🤝",
    },
    "Maintains Presence": {
        bg: "bg-[#38bdf8]/10",
        border: "border-[#38bdf8]/30",
        text: "text-[#38bdf8]",
        icon: "🧘",
    },
    "Listens Actively": {
        bg: "bg-[#34d399]/10",
        border: "border-[#34d399]/30",
        text: "text-[#34d399]",
        icon: "👂",
    },
    "Evokes Awareness": {
        bg: "bg-[#fbbf24]/10",
        border: "border-[#fbbf24]/30",
        text: "text-[#fbbf24]",
        icon: "💡",
    },
    RED_FLAGS: {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        text: "text-red-400",
        icon: "🚩",
    },
};

function getScoreColor(score: number): string {
    if (score >= 8) return "text-[var(--accent-green)]";
    if (score >= 5) return "text-[#fbbf24]";
    return "text-red-400";
}

function getScoreBarColor(score: number): string {
    if (score >= 8) return "bg-gradient-to-r from-[var(--accent-green)] to-[#2dd4bf]";
    if (score >= 5) return "bg-gradient-to-r from-[#fbbf24] to-[#f97316]";
    return "bg-gradient-to-r from-red-500 to-red-600";
}

export default function AnalysisPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const problemId = params.id as string;
    const problem = getProblemById(problemId);
    const sessionId = searchParams.get("session") as Id<"sessions"> | null;

    const [authenticated, setAuthenticated] = useState(false);
    const [checking, setChecking] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Load session from Convex
    const session = useQuery(
        api.sessions.getSession,
        sessionId ? { id: sessionId } : "skip"
    );
    const analysis: AnalysisItem[] | null =
        (session?.analysis as AnalysisItem[] | undefined) ?? null;

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

    // Convex query still loading
    if (session === undefined && sessionId) {
        return (
            <div className="bg-gradient-animated flex min-h-screen flex-col items-center justify-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary-light)] border-t-transparent" />
                <p className="text-sm text-[var(--text-muted)]">Loading analysis...</p>
            </div>
        );
    }

    if (!analysis || analysis.length === 0) {
        return (
            <div className="bg-gradient-animated flex min-h-screen flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-white">No analysis found</h1>
                <p className="text-[var(--text-muted)]">
                    Complete a practice session first to see your analysis.
                </p>
                <button
                    onClick={() => router.push(`/practice/${problemId}`)}
                    className="cursor-pointer rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
                >
                    Go to Practice
                </button>
            </div>
        );
    }

    // Group items by category
    const grouped = analysis.reduce<Record<string, AnalysisItem[]>>(
        (acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        },
        {}
    );

    // Calculate overall stats
    const scoredItems = analysis.filter((a) => a.category !== "RED_FLAGS");
    const overallScore = scoredItems.length
        ? Math.round(
            (scoredItems.reduce((s, a) => s + a.score, 0) /
                (scoredItems.length * 10)) *
            100
        )
        : 0;

    const categoryScores = Object.entries(grouped)
        .filter(([cat]) => cat !== "RED_FLAGS")
        .map(([cat, items]) => ({
            category: cat,
            avg: Math.round(
                (items.reduce((s, a) => s + a.score, 0) / (items.length * 10)) * 100
            ),
        }));

    const redFlags = grouped["RED_FLAGS"] || [];

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
                        <button
                            onClick={() => router.push("/practice")}
                            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-light)] hover:text-white"
                        >
                            {Icons.back}
                            <span className="hidden sm:inline">Practice</span>
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-white">
                                Session Analysis
                            </h1>
                            <p className="text-xs text-[var(--text-muted)]">
                                {problem ? `${problem.icon} ${problem.title}` : `Problem #${problemId}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/practice/${problemId}`)}
                            className="cursor-pointer rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
                        >
                            Practice Again
                        </button>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-sm font-bold text-white">
                            A
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="p-6">
                    {/* ─── Overall Score Banner ─── */}
                    <div
                        className="glass-card mb-6 overflow-hidden"
                        style={{
                            animation: "fadeInUp 0.6s ease-out 0.1s forwards",
                            opacity: 0,
                        }}
                    >
                        <div className="flex flex-col items-center gap-6 p-8 md:flex-row md:gap-10">
                            {/* Score ring */}
                            <div className="relative flex h-36 w-36 flex-shrink-0 items-center justify-center">
                                <svg className="h-36 w-36 -rotate-90" viewBox="0 0 140 140">
                                    <circle
                                        cx="70"
                                        cy="70"
                                        r="60"
                                        fill="none"
                                        stroke="rgba(152,146,176,0.1)"
                                        strokeWidth="12"
                                    />
                                    <circle
                                        cx="70"
                                        cy="70"
                                        r="60"
                                        fill="none"
                                        stroke="url(#scoreGradient)"
                                        strokeWidth="12"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(overallScore / 100) * 377} 377`}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                    <defs>
                                        <linearGradient
                                            id="scoreGradient"
                                            x1="0"
                                            y1="0"
                                            x2="1"
                                            y2="1"
                                        >
                                            <stop offset="0%" stopColor="#a78bfa" />
                                            <stop offset="100%" stopColor="#34d399" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-bold text-white">
                                        {overallScore}%
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        Overall
                                    </span>
                                </div>
                            </div>

                            {/* Category scores */}
                            <div className="flex-1 space-y-3">
                                <h2 className="mb-4 text-lg font-semibold text-white">
                                    Performance Breakdown
                                </h2>
                                {categoryScores.map((cs) => {
                                    const colors = categoryColors[cs.category];
                                    return (
                                        <div key={cs.category} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2 text-[var(--text-muted)]">
                                                    <span>{colors?.icon}</span>
                                                    {cs.category}
                                                </span>
                                                <span className={`font-semibold ${getScoreColor(cs.avg / 10)}`}>
                                                    {cs.avg}%
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-light)]">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${getScoreBarColor(cs.avg / 10)}`}
                                                    style={{ width: `${cs.avg}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ─── Detailed Categories ─── */}
                    <div className="space-y-6">
                        {Object.entries(grouped)
                            .filter(([cat]) => cat !== "RED_FLAGS")
                            .map(([category, items], catIdx) => {
                                const colors = categoryColors[category] || {
                                    bg: "bg-[var(--surface)]",
                                    border: "border-[var(--border)]",
                                    text: "text-white",
                                    icon: "📋",
                                };
                                return (
                                    <div
                                        key={category}
                                        className="glass-card overflow-hidden"
                                        style={{
                                            animation: `fadeInUp 0.6s ease-out ${0.2 + catIdx * 0.1}s forwards`,
                                            opacity: 0,
                                        }}
                                    >
                                        {/* Category header */}
                                        <div
                                            className={`flex items-center gap-3 border-b ${colors.border} px-6 py-4`}
                                        >
                                            <span className="text-xl">{colors.icon}</span>
                                            <h3 className={`text-base font-semibold ${colors.text}`}>
                                                {category}
                                            </h3>
                                        </div>

                                        {/* Metrics */}
                                        <div className="divide-y divide-[var(--border)]">
                                            {items.map((item) => (
                                                <div
                                                    key={item.metric}
                                                    className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-start md:gap-6"
                                                >
                                                    {/* Score */}
                                                    <div className="flex flex-shrink-0 items-center gap-3 md:w-44">
                                                        <div
                                                            className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${getScoreColor(item.score)} bg-[var(--surface-light)]`}
                                                        >
                                                            {item.score}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-white">
                                                                {item.metric}
                                                            </div>
                                                            <div className="text-xs text-[var(--text-muted)]">
                                                                out of 10
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Score bar + comments */}
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-light)]">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ease-out ${getScoreBarColor(item.score)}`}
                                                                style={{
                                                                    width: `${(item.score / 10) * 100}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                                                            {item.comments}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                        {/* ─── Red Flags ─── */}
                        {redFlags.length > 0 && (
                            <div
                                className="glass-card overflow-hidden border-red-500/20"
                                style={{
                                    animation: `fadeInUp 0.6s ease-out ${0.2 + Object.keys(grouped).length * 0.1}s forwards`,
                                    opacity: 0,
                                }}
                            >
                                <div className="flex items-center gap-3 border-b border-red-500/20 bg-red-500/5 px-6 py-4">
                                    <span className="text-xl">🚩</span>
                                    <h3 className="text-base font-semibold text-red-400">
                                        Red Flags
                                    </h3>
                                    {Icons.flag}
                                </div>
                                <div className="px-6 py-5">
                                    {redFlags.map((rf) => (
                                        <div key={rf.metric} className="space-y-2">
                                            <h4 className="text-sm font-medium text-red-300">
                                                {rf.metric}
                                            </h4>
                                            <div className="whitespace-pre-line rounded-xl bg-red-500/5 p-4 text-sm leading-relaxed text-[var(--text-muted)]">
                                                {rf.comments}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom actions */}
                    <div
                        className="mt-8 flex flex-wrap items-center justify-center gap-4"
                        style={{
                            animation: `fadeInUp 0.6s ease-out ${0.3 + Object.keys(grouped).length * 0.1}s forwards`,
                            opacity: 0,
                        }}
                    >
                        <button
                            onClick={() => router.push(`/practice/${problemId}`)}
                            className="flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(124,92,191,0.3)]"
                        >
                            Practice Again
                        </button>
                        <button
                            onClick={() => router.push("/practice")}
                            className="flex cursor-pointer items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--surface-light)]"
                        >
                            Back to Problems
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
