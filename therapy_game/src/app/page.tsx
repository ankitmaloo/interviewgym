"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getClientUserId } from "@/lib/userIdentity";
import {
  DashboardStats,
  getDashboardStatsFromStorage,
} from "@/lib/sessionsStore";
import {
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  clients: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
  trendUp: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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
};

const navItems = [
  { icon: Icons.dashboard, label: "Dashboard", href: "/", active: true },
  { icon: Icons.practice, label: "Practice", href: "/practice" },
  { icon: Icons.analytics, label: "Analytics", href: "/analytics" },
];

type MemoryInsight = {
  metric: string;
  category: string;
  avgScore: number;
  samples: number;
  lastFeedback: string | null;
};

type MemoryInterview = {
  sessionId: string;
  problemId: string;
  problemTitle: string;
  difficulty: string;
  overallScore: number;
  duration: number;
  createdAt: number;
};

type MemorySummary = {
  enabled: boolean;
  message?: string;
  strengths: MemoryInsight[];
  weaknesses: MemoryInsight[];
  recentInterviews: MemoryInterview[];
};

/* ─── Metric Card ─── */

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  gradient,
  delay,
}: {
  title: string;
  value: string;
  change: string;
  changeLabel: string;
  icon: React.ReactNode;
  gradient: string;
  delay: number;
}) {
  return (
    <div
      className="glass-card group relative overflow-hidden p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[var(--border-hover)] hover:shadow-[0_0_40px_rgba(124,92,191,0.12)]"
      style={{ animation: `fadeInUp 0.6s ease-out ${delay}s forwards`, opacity: 0 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[var(--accent-green)]">{Icons.trendUp}</span>
            <span className="text-sm font-medium text-[var(--accent-green)]">{change}</span>
            <span className="text-xs text-[var(--text-muted)]">{changeLabel}</span>
          </div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      {/* Decorative gradient bar */}
      <div className={`absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r ${gradient} opacity-40`} />
    </div>
  );
}

/* ─── Custom Tooltip ─── */

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl">
      <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

/* ─── Main Dashboard ─── */

export default function Home() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [memorySummary, setMemorySummary] = useState<MemorySummary | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("iaso_ai_auth");
    if (auth !== "true") {
      router.push("/login");
    } else {
      setAuthenticated(true);
      setStats(getDashboardStatsFromStorage());
    }
    setChecking(false);
  }, [router]);

  useEffect(() => {
    if (!authenticated) return;

    const refreshStats = () => {
      setStats(getDashboardStatsFromStorage());
    };

    refreshStats();
    window.addEventListener("focus", refreshStats);
    return () => window.removeEventListener("focus", refreshStats);
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    let cancelled = false;

    const fetchMemorySummary = async () => {
      setMemoryLoading(true);
      try {
        const userId = encodeURIComponent(getClientUserId());
        const res = await fetch(`/api/memory/summary?userId=${userId}`);

        if (!res.ok) {
          throw new Error(`Memory request failed (${res.status})`);
        }

        const data = (await res.json()) as MemorySummary;
        if (!cancelled) {
          setMemorySummary(data);
        }
      } catch (error) {
        if (!cancelled) {
          setMemorySummary({
            enabled: false,
            message:
              error instanceof Error
                ? error.message
                : "Memory service unavailable.",
            strengths: [],
            weaknesses: [],
            recentInterviews: [],
          });
        }
      } finally {
        if (!cancelled) {
          setMemoryLoading(false);
        }
      }
    };

    void fetchMemorySummary();

    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  const handleLogout = () => {
    localStorage.removeItem("iaso_ai_auth");
    router.push("/login");
  };

  const radarData = useMemo(() => {
    if (!stats?.categoryAverages) return [];
    return stats.categoryAverages.map(ca => ({
      skill: ca.category.split(' ').slice(-1)[0], // Just the last word for brevity
      fullSkill: ca.category,
      score: ca.avgScore * 10,
      fullMark: 100
    }));
  }, [stats]);

  const progressData = useMemo(() => {
    if (!stats?.scoreOverTime) return [];
    return stats.scoreOverTime.map(s => ({
      name: s.date,
      score: s.score,
      label: s.problemTitle
    }));
  }, [stats]);

  const strengths = memorySummary?.strengths ?? [];
  const weaknesses = memorySummary?.weaknesses ?? [];
  const memoryInterviews = memorySummary?.recentInterviews ?? [];

  if (checking || !authenticated || !stats) {
    return (
      <div className="bg-gradient-animated flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary-light)] border-t-transparent" />
        {!stats && !checking && authenticated && (
          <p className="text-sm text-[var(--text-muted)]">Building your dashboard...</p>
        )}
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
                Interview Gym
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
            id="logout-button"
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
              id="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="cursor-pointer rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-light)] hover:text-white"
            >
              {sidebarOpen ? Icons.close : Icons.menu}
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Dashboard</h1>
              <p className="text-xs text-[var(--text-muted)]">Welcome back, Candidate</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-[var(--accent-green)]" />
              <span className="text-xs text-[var(--text-muted)]">Last updated: just now</span>
            </div>
            <button
              onClick={() => router.push("/roles")}
              className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--surface-light)]"
            >
              Role Scout
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-sm font-bold text-white">
              A
            </div>
          </div>
        </header>

        {/* Dashboard content */}
        <div className="p-6">
          {/* ─── Metric Cards ─── */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Avg. Performance"
              value={`${stats.avgScore}%`}
              change={stats.totalSessions > 1 ? "+5%" : "NEW"}
              changeLabel="vs last session"
              icon={Icons.analytics}
              gradient="from-[#7c5cbf] to-[#a78bfa]"
              delay={0.1}
            />
            <MetricCard
              title="Total Sessions"
              value={stats.totalSessions.toString()}
              change={`+${stats.totalSessions}`}
              changeLabel="all time"
              icon={Icons.sessions}
              gradient="from-[#38bdf8] to-[#818cf8]"
              delay={0.2}
            />
            <MetricCard
              title="Practice Time"
              value={formatDuration(stats.totalPracticeTime)}
              change="Goal 80%"
              changeLabel="of weekly target"
              icon={Icons.heart}
              gradient="from-[#f472b6] to-[#a78bfa]"
              delay={0.3}
            />
          </div>

          {/* ─── Interview Memory ─── */}
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <div
              className="glass-card col-span-1 p-6 lg:col-span-2"
              style={{ animation: "fadeInUp 0.6s ease-out 0.4s forwards", opacity: 0 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Interview Memory</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Neo4j summary of what you are strong at and where to improve
                  </p>
                </div>
                <span className="rounded-md bg-[var(--surface-light)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Neo4j
                </span>
              </div>

              {memoryLoading ? (
                <div className="flex h-36 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary-light)] border-t-transparent" />
                </div>
              ) : !memorySummary?.enabled ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-light)]/20 p-4 text-sm text-[var(--text-muted)]">
                  {memorySummary?.message ||
                    "Memory is disabled. Add NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD to enable it."}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[var(--accent-green)]">Good At</h3>
                    {strengths.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        Complete a few interviews to build strengths.
                      </p>
                    ) : (
                      strengths.map((item) => (
                        <div key={`${item.category}-${item.metric}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-light)]/20 p-3">
                          <p className="text-sm font-medium text-white">{item.metric}</p>
                          <p className="text-xs text-[var(--text-muted)]">{item.category}</p>
                          <p className="mt-1 text-xs text-[var(--accent-green)]">
                            Avg {item.avgScore.toFixed(1)}/10 across {item.samples} sessions
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-red-300">Needs Work</h3>
                    {weaknesses.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        No recurring weakness yet.
                      </p>
                    ) : (
                      weaknesses.map((item) => (
                        <div key={`${item.category}-${item.metric}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-light)]/20 p-3">
                          <p className="text-sm font-medium text-white">{item.metric}</p>
                          <p className="text-xs text-[var(--text-muted)]">{item.category}</p>
                          <p className="mt-1 text-xs text-red-300">
                            Avg {item.avgScore.toFixed(1)}/10 across {item.samples} sessions
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className="glass-card p-6"
              style={{ animation: "fadeInUp 0.6s ease-out 0.45s forwards", opacity: 0 }}
            >
              <h2 className="text-lg font-semibold text-white">Previous Interviews</h2>
              <p className="mb-4 text-sm text-[var(--text-muted)]">
                Retrieved from memory graph
              </p>

              {memoryLoading ? (
                <div className="flex h-36 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary-light)] border-t-transparent" />
                </div>
              ) : !memorySummary?.enabled ? (
                <p className="text-sm text-[var(--text-muted)]">Memory unavailable.</p>
              ) : memoryInterviews.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No interviews in memory yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {memoryInterviews.map((session) => (
                    <button
                      key={session.sessionId}
                      onClick={() =>
                        router.push(
                          `/practice/${session.problemId}/analysis?session=${session.sessionId}`
                        )
                      }
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-all duration-200 hover:border-[var(--border)] hover:bg-[var(--surface-light)]"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{session.problemTitle}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {session.difficulty.toUpperCase()} · {formatDuration(session.duration)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[var(--primary-light)]">
                        {session.overallScore}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Charts Row 1 ─── */}
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {/* Progress Trend (wide) */}
            <div
              className="glass-card col-span-1 p-6 lg:col-span-2"
              style={{ animation: "fadeInUp 0.6s ease-out 0.5s forwards", opacity: 0 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Score History</h2>
                  <p className="text-sm text-[var(--text-muted)]">Overall performance across sessions</p>
                </div>
                {stats.scoreOverTime.length > 1 && (
                  <span className="rounded-lg bg-[var(--accent-green)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent-green)]">
                    ↑ {Math.max(0, stats.scoreOverTime[stats.scoreOverTime.length - 1].score - stats.scoreOverTime[0].score).toFixed(1)}pts improvement
                  </span>
                )}
              </div>
              <div className="h-72">
                {stats.scoreOverTime.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl bg-[var(--surface-light)]/30 border border-dashed border-[var(--border)]">
                    <p className="text-sm text-[var(--text-muted)]">No sessions recorded yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={progressData}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(152,146,176,0.1)" />
                      <XAxis dataKey="name" tick={{ fill: "#9892b0", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#9892b0", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="score"
                        name="Score"
                        stroke="#a78bfa"
                        strokeWidth={2.5}
                        fill="url(#scoreGradient)"
                        dot={{ r: 4, fill: "#a78bfa", stroke: "#1a1730", strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: "#a78bfa", stroke: "#fff", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Skill Radar */}
            <div
              className="glass-card p-6"
              style={{ animation: "fadeInUp 0.6s ease-out 0.6s forwards", opacity: 0 }}
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">Skill Breakdown</h2>
                <p className="text-sm text-[var(--text-muted)]">Core interview competencies</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="rgba(152,146,176,0.15)" />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: "#9892b0", fontSize: 11 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#38bdf8"
                      fill="#38bdf8"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>


          {/* ─── Recent Activity ─── */}
          <div
            className="glass-card mt-6 p-6"
            style={{ animation: "fadeInUp 0.6s ease-out 0.9s forwards", opacity: 0 }}
          >
            <h2 className="mb-4 text-lg font-semibold text-white">Recent Sessions</h2>
            <div className="space-y-3">
              {stats.recentSessions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-[var(--text-muted)]">No practice sessions found. Start your first session to see activity here!</p>
                </div>
              ) : (
                stats.recentSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => router.push(`/practice/${session.problemId}/analysis?session=${session.id}`)}
                    className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-transparent px-4 py-3 text-left transition-all duration-200 hover:border-[var(--border)] hover:bg-[var(--surface-light)]"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/20 text-sm font-bold text-[var(--primary-light)]">
                      {session.overallScore}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{session.problemTitle}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {session.difficulty.toUpperCase()} · {formatDuration(session.duration)}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{getTimeAgo(session.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
