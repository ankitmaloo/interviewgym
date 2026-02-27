"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useConversation } from "@elevenlabs/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getProblemById, type Difficulty } from "@/lib/problems";
import {
    loadRoleTargetsFromStorage,
    loadSelectedRoleTargetId,
    type RoleTarget,
} from "@/lib/roleTargets";

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
    phone: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
    ),
    phoneOff: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L8.228 3.684A1 1 0 007.28 3H5z" />
        </svg>
    ),
    mic: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
    ),
    notes: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    ),
    back: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
    ),
};

const navItems = [
    { icon: Icons.dashboard, label: "Dashboard", href: "/" },
    { icon: Icons.practice, label: "Practice", href: "/practice", active: true },
    { icon: Icons.analytics, label: "Analytics", href: "/analytics" },
];

type ChatMessage = {
    role: "user" | "agent";
    text: string;
    timestamp: Date;
};

const difficultyLabels: Record<Difficulty, string> = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
};

export default function PracticeSessionPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const problemId = params.id as string;
    const problem = getProblemById(problemId);
    const difficulty = (searchParams.get("difficulty") || "easy") as Difficulty;
    const focusRoleIdFromQuery = searchParams.get("focusRole");

    const [authenticated, setAuthenticated] = useState(false);
    const [checking, setChecking] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [focusedRole, setFocusedRole] = useState<RoleTarget | null>(null);
    const [notes, setNotes] = useState(
        "Session Notes\n─────────────────────\n\n• Key observations:\n\n\n• Action items:\n\n\n• Follow-up questions:\n\n"
    );
    const [callDuration, setCallDuration] = useState(0);
    const [callStartTime, setCallStartTime] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [agentMode, setAgentMode] = useState<string>("listening");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<ChatMessage[]>([]);

    // Keep ref in sync with state so endCall callback can access latest messages
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const conversation = useConversation({
        onConnect: () => {
            console.log("Connected to ElevenLabs agent");
            setCallStartTime(Date.now());
            setErrorMessage(null);
            setMessages([]);
        },
        onDisconnect: () => {
            console.log("Disconnected from ElevenLabs agent");
            setCallStartTime(null);
        },
        onMessage: (message) => {
            console.log("ElevenLabs message:", message);
            if (message.message) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: message.role === "agent" ? "agent" : "user",
                        text: message.message,
                        timestamp: new Date(),
                    },
                ]);
            }
        },
        onModeChange: (data) => {
            console.log("Mode change:", data);
            setAgentMode(data.mode);
        },
        onError: (error) => {
            console.error("ElevenLabs error:", error);
            const errorMsg =
                typeof error === "string"
                    ? error
                    : (error as Error)?.message || "Connection error occurred";
            setErrorMessage(errorMsg);
        },
    });

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auth check
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
        const requestedRoleId = focusRoleIdFromQuery || loadSelectedRoleTargetId();
        if (!requestedRoleId) {
            setFocusedRole(null);
            return;
        }

        const matchingRole = storedTargets.find((target) => target.id === requestedRoleId) ?? null;
        setFocusedRole(matchingRole);
    }, [authenticated, focusRoleIdFromQuery]);

    // Call timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callStartTime) {
            interval = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => clearInterval(interval);
    }, [callStartTime]);

    const handleLogout = () => {
        localStorage.removeItem("iaso_ai_auth");
        router.push("/login");
    };

    const startCall = useCallback(async () => {
        try {
            setErrorMessage(null);
            await navigator.mediaDevices.getUserMedia({ audio: true });

            const agentId = problem?.agents[difficulty];
            if (!agentId) {
                setErrorMessage(
                    `No agent configured for this problem at ${difficultyLabels[difficulty]} difficulty. Set NEXT_PUBLIC_AGENT_${problemId}_${difficulty.toUpperCase()} in your .env.local file.`
                );
                return;
            }

            const conversationId = await conversation.startSession({
                agentId,
                connectionType: "websocket",
            });
            console.log("Conversation started:", conversationId);
        } catch (error) {
            console.error("Failed to start call:", error);
            const msg =
                error instanceof Error ? error.message : "Failed to start call";
            if (
                msg.includes("Permission denied") ||
                msg.includes("NotAllowedError")
            ) {
                setErrorMessage(
                    "Microphone access denied. Please allow microphone access and try again."
                );
            } else {
                setErrorMessage(msg);
            }
        }
    }, [conversation, problem, problemId]);

    const saveSession = useMutation(api.sessions.saveSession);

    const endCall = useCallback(async () => {
        try {
            await conversation.endSession();

            // Format transcript as a labelled string for the evaluate endpoint
            const currentMessages = messagesRef.current;
            if (currentMessages.length > 0) {
                setIsAnalyzing(true);
                try {
                    const transcriptString = currentMessages
                        .map((m, i) => {
                            const speaker = m.role === "user" ? "Coach" : "Client";
                            return `T${i + 1} (${speaker}): ${m.text}`;
                        })
                        .join("\n");

                    const res = await fetch("/api/evaluate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ transcript: transcriptString }),
                    });

                    if (res.ok) {
                        const { evidence, scores: analysis } = await res.json();

                        // Compute overall score
                        const scored = analysis.filter(
                            (a: { category: string }) => a.category !== "RED_FLAGS"
                        );
                        const overallScore = scored.length
                            ? Math.round(
                                (scored.reduce(
                                    (s: number, a: { score: number }) => s + a.score,
                                    0
                                ) /
                                    (scored.length * 10)) *
                                100
                            )
                            : 0;

                        // Save to Convex
                        const baseTitle = problem?.title || `Problem ${problemId}`;
                        const sessionTitle = focusedRole
                            ? `${baseTitle} · ${focusedRole.role}`
                            : baseTitle;

                        const sessionId = await saveSession({
                            problemId,
                            problemTitle: sessionTitle,
                            difficulty,
                            transcript: transcriptString,
                            evidence,
                            analysis,
                            overallScore,
                            duration: callDuration,
                        });

                        router.push(
                            `/practice/${problemId}/analysis?session=${sessionId}`
                        );
                    } else {
                        const errBody = await res.json().catch(() => null);
                        const errMsg = errBody?.error || `Analysis failed (${res.status})`;
                        console.error("Evaluate API error:", errMsg);
                        setErrorMessage(errMsg);
                        setIsAnalyzing(false);
                    }
                } catch (err) {
                    console.error("Failed to analyse session:", err);
                    setIsAnalyzing(false);
                }
            }
        } catch (error) {
            console.error("Failed to end call:", error);
        }
    }, [conversation, problemId, problem, focusedRole, difficulty, callDuration, router, saveSession]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60)
            .toString()
            .padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    if (checking || !authenticated) {
        return (
            <div className="bg-gradient-animated flex min-h-screen items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary-light)] border-t-transparent" />
            </div>
        );
    }

    if (isAnalyzing) {
        return (
            <div className="bg-gradient-animated flex min-h-screen flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--primary-light)] border-t-transparent" />
                <h2 className="text-xl font-semibold text-white">Analyzing your session...</h2>
                <p className="text-sm text-[var(--text-muted)]">
                    Evaluating coaching performance across key competencies
                </p>
            </div>
        );
    }

    if (!problem) {
        return (
            <div className="bg-gradient-animated flex min-h-screen flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-white">Problem not found</h1>
                <button
                    onClick={() => router.push("/practice")}
                    className="cursor-pointer rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
                >
                    Back to Practice
                </button>
            </div>
        );
    }

    const isConnected = conversation.status === "connected";
    const isConnecting = conversation.status === "connecting";
    const isSpeaking = conversation.isSpeaking;

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
                        {/* Back button */}
                        <button
                            onClick={() =>
                                router.push(
                                    focusedRole
                                        ? `/practice?focusRole=${encodeURIComponent(focusedRole.id)}`
                                        : "/practice"
                                )
                            }
                            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-light)] hover:text-white"
                        >
                            {Icons.back}
                            <span className="hidden sm:inline">Back</span>
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-white">
                                {problem.icon} {problem.title}
                            </h1>
                            <p className="text-xs text-[var(--text-muted)]">
                                {problem.category} · {difficultyLabels[difficulty]}
                                {focusedRole ? ` · ${focusedRole.role}` : ""}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isConnected && (
                            <div className="flex items-center gap-2 rounded-xl border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/10 px-3 py-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-green)] opacity-75" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent-green)]" />
                                </span>
                                <span className="text-xs font-medium text-[var(--accent-green)]">
                                    Live · {formatDuration(callDuration)}
                                </span>
                            </div>
                        )}
                        {isConnecting && (
                            <div className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2">
                                <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                                <span className="text-xs font-medium text-[var(--accent)]">
                                    Connecting...
                                </span>
                            </div>
                        )}
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-sm font-bold text-white">
                            A
                        </div>
                    </div>
                </header>

                {/* Practice content */}
                <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
                    {/* ─── Left: Agent Call Area ─── */}
                    <div className="flex flex-1 flex-col p-6">
                        <div
                            className="glass-card flex flex-1 flex-col overflow-hidden"
                            style={{
                                animation: "fadeInUp 0.6s ease-out 0.1s forwards",
                                opacity: 0,
                            }}
                        >
                            {/* Call center area */}
                            <div className="flex flex-1 flex-col items-center justify-center p-8">
                                {/* Agent avatar */}
                                <div className="relative mb-8">
                                    <div
                                        className={`flex h-32 w-32 items-center justify-center rounded-full transition-all duration-500 ${isConnected
                                            ? isSpeaking
                                                ? "bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent)] shadow-[0_0_60px_rgba(52,211,153,0.4)]"
                                                : "bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-[0_0_40px_rgba(124,92,191,0.3)]"
                                            : isConnecting
                                                ? "bg-gradient-to-br from-[var(--accent)] to-[var(--primary)] shadow-[0_0_30px_rgba(56,189,248,0.3)]"
                                                : `bg-gradient-to-br ${problem.color}`
                                            }`}
                                    >
                                        {isConnected ? (
                                            <div className="flex flex-col items-center gap-1">
                                                {Icons.mic}
                                                <span className="mt-1 text-xs font-medium text-white/80">
                                                    {isSpeaking || agentMode === "speaking"
                                                        ? "Agent speaking"
                                                        : "Listening..."}
                                                </span>
                                            </div>
                                        ) : isConnecting ? (
                                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                                        ) : (
                                            <span className="text-4xl">{problem.icon}</span>
                                        )}
                                    </div>

                                    {isConnected && (
                                        <>
                                            <div
                                                className="absolute inset-0 animate-ping rounded-full border-2 border-[var(--accent-green)]/20"
                                                style={{ animationDuration: "2s" }}
                                            />
                                            <div
                                                className="absolute -inset-3 animate-ping rounded-full border border-[var(--accent-green)]/10"
                                                style={{ animationDuration: "3s" }}
                                            />
                                        </>
                                    )}
                                </div>

                                {/* Status */}
                                <h2 className="mb-2 text-xl font-semibold text-white">
                                    {isConnected
                                        ? "Session in Progress"
                                        : isConnecting
                                            ? "Connecting..."
                                            : problem.title}
                                </h2>
                                <p className="mb-6 max-w-sm text-center text-sm text-[var(--text-muted)]">
                                    {isConnected
                                        ? "Your AI client is active. Practice your coaching techniques in real-time."
                                        : isConnecting
                                            ? "Setting up your practice session..."
                                            : problem.description}
                                </p>

                                {focusedRole && (
                                    <div className="mb-6 w-full max-w-xl rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-left">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                                            Role Focus
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-white">
                                            {focusedRole.role} · {focusedRole.domain}
                                        </p>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                                            {focusedRole.aspiration}
                                        </p>
                                        <p className="mt-1 text-[11px] text-[var(--text-muted)]/90">
                                            {focusedRole.postings.length} linked posting
                                            {focusedRole.postings.length === 1 ? "" : "s"}
                                        </p>
                                    </div>
                                )}

                                {/* Error */}
                                {errorMessage && (
                                    <div className="mb-4 max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
                                        {errorMessage}
                                    </div>
                                )}

                                {/* Call controls */}
                                <div className="flex items-center gap-4">
                                    {!isConnected && !isConnecting ? (
                                        <button
                                            id="start-call-btn"
                                            onClick={startCall}
                                            className="flex cursor-pointer items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--accent-green)] to-[#2dd4bf] px-8 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(52,211,153,0.4)] active:scale-95"
                                        >
                                            {Icons.phone}
                                            Start Call
                                        </button>
                                    ) : isConnecting ? (
                                        <button
                                            disabled
                                            className="flex cursor-not-allowed items-center gap-3 rounded-2xl bg-[var(--surface-light)] px-8 py-4 text-base font-semibold text-[var(--text-muted)] opacity-60"
                                        >
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-transparent" />
                                            Connecting...
                                        </button>
                                    ) : (
                                        <button
                                            id="end-call-btn"
                                            onClick={endCall}
                                            className="flex cursor-pointer items-center gap-3 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] active:scale-95"
                                        >
                                            {Icons.phoneOff}
                                            End Call
                                        </button>
                                    )}
                                </div>

                                {isConnected && (
                                    <div className="mt-4 font-mono text-2xl font-bold text-white">
                                        {formatDuration(callDuration)}
                                    </div>
                                )}
                            </div>

                            {/* Conversation transcript */}
                            {messages.length > 0 && (
                                <div className="border-t border-[var(--border)] p-4">
                                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                        Conversation
                                    </h3>
                                    <div className="max-h-48 space-y-2 overflow-y-auto">
                                        {messages.map((msg, i) => (
                                            <div
                                                key={i}
                                                className={`flex gap-3 rounded-lg px-3 py-2 text-sm ${msg.role === "agent"
                                                    ? "bg-[var(--primary)]/10 text-[var(--primary-light)]"
                                                    : "bg-[var(--surface-light)] text-white"
                                                    }`}
                                            >
                                                <span className="flex-shrink-0 text-xs font-bold uppercase opacity-60">
                                                    {msg.role === "agent" ? "AI" : "You"}
                                                </span>
                                                <span>{msg.text}</span>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Right: Notes Panel ─── */}
                    <div className="flex w-full flex-col p-6 pt-0 lg:w-[420px] lg:pt-6">
                        <div
                            className="glass-card flex flex-1 flex-col overflow-hidden"
                            style={{
                                animation: "fadeInUp 0.6s ease-out 0.2s forwards",
                                opacity: 0,
                            }}
                        >
                            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                                <div className="flex items-center gap-2 text-white">
                                    {Icons.notes}
                                    <h3 className="text-sm font-semibold">Session Notes</h3>
                                </div>
                                <button
                                    onClick={() => setNotes("")}
                                    className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-light)] hover:text-white"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="flex-1 p-4">
                                <textarea
                                    id="session-notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={
                                        "Type your session notes here...\n\n• Key observations\n• Action items\n• Follow-up questions"
                                    }
                                    className="h-full w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-white placeholder-[var(--text-muted)]/50 transition-all duration-300 focus:border-[var(--primary-light)] focus:ring-1 focus:ring-[var(--glow)] focus:outline-none"
                                    style={{ fontFamily: "var(--font-mono), monospace" }}
                                />
                            </div>
                            <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
                                <span className="text-xs text-[var(--text-muted)]">
                                    {notes.length} characters
                                </span>
                                <span className="text-xs text-[var(--text-muted)]/60">
                                    Auto-saved locally
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
