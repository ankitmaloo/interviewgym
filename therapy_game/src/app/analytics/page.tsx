"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

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
    sessions: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    ),
    analytics: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    arrow: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    ),
};

const navItems = [
    { icon: Icons.dashboard, label: "Dashboard", href: "/" },
    { icon: Icons.practice, label: "Practice", href: "/practice" },
    { icon: Icons.analytics, label: "Analytics", href: "/analytics", active: true },
];

/* ─── Helpers ─── */
const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
};

export default function AnalyticsPage() {
    const router = useRouter();
    const [authenticated, setAuthenticated] = useState(false);
    const [checking, setChecking] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const sessions = useQuery(api.sessions.listSessions);

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
            {/* Mobile overlay */}
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
                {/* Sidebar header */}
                <div className="flex h-16 items-center justify-between px-5">
                    <div className={`flex items-center gap-3 transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-100"}`}>
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

                {/* Nav items */}
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
                            {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                {/* Logout at bottom */}
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
            <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
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
                            <h1 className="text-lg font-bold text-white">Analytics</h1>
                            <p className="text-xs text-[var(--text-muted)]">Detailed session history and reports</p>
                        </div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-sm font-bold text-white">
                        A
                    </div>
                </header>

                {/* Content */}
                <div className="p-6">
                    <div className="glass-card overflow-hidden">
                        <div className="border-b border-[var(--border)] bg-[var(--surface)]/50 px-6 py-4">
                            <h2 className="text-lg font-semibold text-white">All Practice Sessions</h2>
                            <p className="text-sm text-[var(--text-muted)]">Overview of your coaching performance</p>
                        </div>

                        <div className="divide-y divide-[var(--border)]">
                            {sessions === undefined ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--primary-light)] border-t-transparent" />
                                    <p className="text-sm text-[var(--text-muted)]">Loading sessions...</p>
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-light)] text-[var(--text-muted)]">
                                        {Icons.sessions}
                                    </div>
                                    <h3 className="mb-1 text-lg font-medium text-white">No sessions yet</h3>
                                    <p className="mb-6 text-sm text-[var(--text-muted)]">Complete a practice scenario to see your details here.</p>
                                    <button
                                        onClick={() => router.push("/practice")}
                                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--primary-light)] hover:scale-105 active:scale-95"
                                    >
                                        Start Practice
                                    </button>
                                </div>
                            ) : (
                                sessions.map((session: any, i: number) => (
                                    <div
                                        key={session._id}
                                        className="flex flex-col gap-4 p-6 transition-colors hover:bg-[var(--surface-light)]/30 sm:flex-row sm:items-center"
                                        style={{ animation: `fadeInUp 0.5s ease-out ${i * 0.05}s forwards`, opacity: 0 }}
                                    >
                                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-lg font-bold text-[var(--primary-light)]">
                                            {session.overallScore}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="mb-1 flex items-center gap-2">
                                                <h3 className="truncate font-semibold text-white">{session.problemTitle}</h3>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${session.difficulty === "easy" ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)]" :
                                                    session.difficulty === "medium" ? "bg-amber-400/10 text-amber-400" :
                                                        "bg-pink-500/10 text-pink-500"
                                                    }`}>
                                                    {session.difficulty}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                                                <span>{new Date(session.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                                <span className="flex items-center gap-1.5">• {formatDuration(session.duration)}</span>
                                                <span className="flex items-center gap-1.5">• {session.analysis.length} metrics scored</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => router.push(`/practice/${session.problemId}/analysis?session=${session._id}`)}
                                            className="group flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-[var(--primary-light)] hover:bg-[var(--primary)]/10"
                                        >
                                            View Report
                                            <span className="transition-transform group-hover:translate-x-0.5">{Icons.arrow}</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
