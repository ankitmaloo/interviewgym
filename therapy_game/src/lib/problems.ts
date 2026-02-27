export type Difficulty = "easy" | "medium" | "hard";

export type Problem = {
    id: string;
    title: string;
    description: string;
    category: string;
    agents: Record<Difficulty, string>;
    color: string;
    icon: string;
    estimatedTime: Record<Difficulty, string>;
};

/**
 * List of coaching problems.
 *
 * Each problem has 3 difficulty levels (easy, medium, hard),
 * each mapping to a different ElevenLabs agent.
 *
 * Set agent IDs in .env.local:
 *   NEXT_PUBLIC_AGENT_<ID>_EASY=agent_xxxxx
 *   NEXT_PUBLIC_AGENT_<ID>_MEDIUM=agent_xxxxx
 *   NEXT_PUBLIC_AGENT_<ID>_HARD=agent_xxxxx
 */
export const problems: Problem[] = [
    {
        id: "1",
        title: "Anxious Client Session",
        description:
            "Practice coaching a client experiencing anxiety and overthinking. Focus on active listening, grounding techniques, and helping them develop coping strategies.",
        category: "Anxiety",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_1_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_1_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_1_HARD || "",
        },
        color: "from-[#7c5cbf] to-[#a78bfa]",
        icon: "🧠",
        estimatedTime: { easy: "10 min", medium: "15 min", hard: "20 min" },
    },
    {
        id: "2",
        title: "Career Transition Crisis",
        description:
            "Guide a client going through a major career change who feels lost and uncertain. Help them explore values, strengths, and next steps.",
        category: "Career",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_2_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_2_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_2_HARD || "",
        },
        color: "from-[#38bdf8] to-[#818cf8]",
        icon: "💼",
        estimatedTime: { easy: "10 min", medium: "20 min", hard: "25 min" },
    },
    {
        id: "3",
        title: "Relationship Conflict",
        description:
            "Work with a client navigating a difficult relationship conflict. Practice empathy, reframing perspectives, and facilitating healthy communication.",
        category: "Relationships",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_3_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_3_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_3_HARD || "",
        },
        color: "from-[#f472b6] to-[#a78bfa]",
        icon: "💔",
        estimatedTime: { easy: "15 min", medium: "20 min", hard: "25 min" },
    },
    {
        id: "4",
        title: "Grief & Loss Support",
        description:
            "Support a client processing grief and loss. Practice holding space, validating emotions, and guiding them through stages of healing.",
        category: "Grief",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_4_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_4_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_4_HARD || "",
        },
        color: "from-[#34d399] to-[#38bdf8]",
        icon: "🕊️",
        estimatedTime: { easy: "10 min", medium: "20 min", hard: "25 min" },
    },
    {
        id: "5",
        title: "Low Self-Esteem",
        description:
            "Coach a client struggling with low self-esteem and negative self-talk. Practice cognitive reframing and strengths-based approaches.",
        category: "Self-Esteem",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_5_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_5_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_5_HARD || "",
        },
        color: "from-[#fbbf24] to-[#f97316]",
        icon: "🌟",
        estimatedTime: { easy: "10 min", medium: "15 min", hard: "20 min" },
    },
    {
        id: "6",
        title: "Burnout Recovery",
        description:
            "Help a client experiencing professional burnout regain balance. Explore boundary-setting, stress management, and life priorities.",
        category: "Burnout",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_6_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_6_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_6_HARD || "",
        },
        color: "from-[#ef4444] to-[#f97316]",
        icon: "🔥",
        estimatedTime: { easy: "10 min", medium: "20 min", hard: "25 min" },
    },
];

export function getProblemById(id: string): Problem | undefined {
    return problems.find((p) => p.id === id);
}
