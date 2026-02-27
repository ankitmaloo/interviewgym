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
 * List of interview practice scenarios.
 *
 * Each scenario has 3 difficulty levels (easy, medium, hard),
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
        title: "Teamwork & Collaboration",
        description:
            "Practice answering behavioral questions about working in teams. Demonstrate your ability to collaborate, handle conflict, and contribute to group success using specific examples.",
        category: "Behavioral",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_1_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_1_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_1_HARD || "",
        },
        color: "from-[#7c5cbf] to-[#a78bfa]",
        icon: "🤝",
        estimatedTime: { easy: "10 min", medium: "15 min", hard: "20 min" },
    },
    {
        id: "2",
        title: "Leadership & Initiative",
        description:
            "Answer questions about times you've taken initiative, led projects, or influenced others. Show your leadership potential through concrete examples and measurable outcomes.",
        category: "Behavioral",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_2_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_2_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_2_HARD || "",
        },
        color: "from-[#38bdf8] to-[#818cf8]",
        icon: "⭐",
        estimatedTime: { easy: "10 min", medium: "20 min", hard: "25 min" },
    },
    {
        id: "3",
        title: "Problem-Solving & Challenges",
        description:
            "Discuss challenging situations you've faced and how you overcame them. Demonstrate analytical thinking, resourcefulness, and resilience with specific examples.",
        category: "Behavioral",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_3_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_3_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_3_HARD || "",
        },
        color: "from-[#f472b6] to-[#a78bfa]",
        icon: "🧩",
        estimatedTime: { easy: "15 min", medium: "20 min", hard: "25 min" },
    },
    {
        id: "4",
        title: "Tell Me About Yourself",
        description:
            "Practice your elevator pitch and career story. Learn to concisely communicate your background, skills, interests, and why you're a great fit for the role.",
        category: "Introduction",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_4_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_4_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_4_HARD || "",
        },
        color: "from-[#34d399] to-[#38bdf8]",
        icon: "👤",
        estimatedTime: { easy: "10 min", medium: "20 min", hard: "25 min" },
    },
    {
        id: "5",
        title: "Weaknesses & Failures",
        description:
            "Practice discussing weaknesses, mistakes, and failures professionally. Demonstrate self-awareness, growth mindset, and ability to learn from setbacks.",
        category: "Behavioral",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_5_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_5_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_5_HARD || "",
        },
        color: "from-[#fbbf24] to-[#f97316]",
        icon: "📈",
        estimatedTime: { easy: "10 min", medium: "15 min", hard: "20 min" },
    },
    {
        id: "6",
        title: "Technical Difficulties & Debugging",
        description:
            "Discuss challenging technical problems you've faced in projects - bugs, performance issues, or system failures. Explain your debugging approach, problem-solving process, and how you resolved the issue.",
        category: "Technical Behavioral",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_6_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_6_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_6_HARD || "",
        },
        color: "from-[#ef4444] to-[#f97316]",
        icon: "🐛",
        estimatedTime: { easy: "10 min", medium: "20 min", hard: "25 min" },
    },
    {
        id: "7",
        title: "Learning New Technologies",
        description:
            "Share experiences where you had to quickly learn a new programming language, framework, or tool. Demonstrate adaptability, learning strategies, and how you applied new knowledge to deliver results.",
        category: "Technical Behavioral",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_7_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_7_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_7_HARD || "",
        },
        color: "from-[#10b981] to-[#34d399]",
        icon: "📚",
        estimatedTime: { easy: "10 min", medium: "15 min", hard: "20 min" },
    },
    {
        id: "8",
        title: "Deadlines & Time Pressure",
        description:
            "Practice answering questions about working under tight deadlines or managing multiple competing priorities. Show your time management, prioritization skills, and ability to deliver under pressure.",
        category: "Technical Behavioral",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_8_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_8_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_8_HARD || "",
        },
        color: "from-[#ec4899] to-[#f43f5e]",
        icon: "⏰",
        estimatedTime: { easy: "10 min", medium: "15 min", hard: "20 min" },
    },
    {
        id: "9",
        title: "Code Review & Feedback",
        description:
            "Discuss experiences giving or receiving code review feedback. Demonstrate collaboration skills, technical communication, handling criticism constructively, and commitment to code quality.",
        category: "Technical Behavioral",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_9_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_9_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_9_HARD || "",
        },
        color: "from-[#8b5cf6] to-[#a78bfa]",
        icon: "🔍",
        estimatedTime: { easy: "10 min", medium: "15 min", hard: "20 min" },
    },
    {
        id: "10",
        title: "System Design & Architecture",
        description:
            "Answer questions about designing or architecting technical solutions. Explain your decision-making process, trade-offs considered, and how you balanced requirements like scalability, performance, and maintainability.",
        category: "Technical Behavioral",
        agents: {
            easy: process.env.NEXT_PUBLIC_AGENT_10_EASY || "",
            medium: process.env.NEXT_PUBLIC_AGENT_10_MEDIUM || "",
            hard: process.env.NEXT_PUBLIC_AGENT_10_HARD || "",
        },
        color: "from-[#06b6d4] to-[#3b82f6]",
        icon: "🏗️",
        estimatedTime: { easy: "15 min", medium: "20 min", hard: "30 min" },
    },
];

export function getProblemById(id: string): Problem | undefined {
    return problems.find((p) => p.id === id);
}
