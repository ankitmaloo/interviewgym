import { NextResponse } from "next/server";

/**
 * POST /api/test_analyse
 *
 * Accepts a transcript and returns hardcoded interview practice analysis.
 * Replace this with a real analysis backend later.
 */
export async function POST(request: Request) {
    // In the future, parse the transcript and send to a real LLM / analysis service
    const body = await request.json();
    console.log("Received transcript for analysis:", body);

    const analysis = [
        {
            category: "Answer Completeness",
            metric: "Provides Context/Background",
            score: 8,
            comments:
                "At T1–T3 the candidate provided clear context about the project, including timeline and team size. Could have added more details about the business impact or stakeholders.",
        },
        {
            category: "Answer Completeness",
            metric: "Explains Actions Taken",
            score: 9,
            comments:
                "The candidate clearly described their specific actions at T5–T8, including technical decisions and collaboration steps. Well-detailed explanation of the process.",
        },
        {
            category: "Answer Completeness",
            metric: "States Clear Results/Outcomes",
            score: 7,
            comments:
                "Results mentioned at T10 included quantifiable metrics (40% improvement), but could have elaborated on long-term impact or lessons learned.",
        },
        {
            category: "Answer Completeness",
            metric: "Includes Learning/Reflection (when applicable)",
            score: 6,
            comments:
                "Brief reflection at T12 about what was learned, but could have gone deeper into how this experience shapes current approach.",
        },
        {
            category: "Response Quality & Specificity",
            metric: "Uses Specific Concrete Examples",
            score: 9,
            comments:
                "Strong use of specific technical examples at T5–T7, including tools used and specific challenges faced. Examples were relevant and detailed.",
        },
        {
            category: "Response Quality & Specificity",
            metric: "Provides Relevant Details and Evidence",
            score: 8,
            comments:
                "Good balance of technical and contextual details. Metrics at T10 added credibility. Could have included more stakeholder perspectives.",
        },
        {
            category: "Response Quality & Specificity",
            metric: "Stays On Topic and Focused",
            score: 9,
            comments:
                "Response remained focused on the question throughout. No tangential digressions. Clear narrative arc from problem to solution.",
        },
        {
            category: "Response Quality & Specificity",
            metric: "Answers Question Fully and Directly",
            score: 8,
            comments:
                "Question was directly addressed from T1. All key components covered, though additional depth on team dynamics would strengthen the answer.",
        },
        {
            category: "Communication & Delivery",
            metric: "Clear and Articulate",
            score: 9,
            comments:
                "Language was precise and professional throughout. Technical concepts explained clearly without unnecessary jargon. Easy to follow.",
        },
        {
            category: "Communication & Delivery",
            metric: "Well-Structured with Logical Flow",
            score: 9,
            comments:
                "Excellent structure following STAR format naturally. Clear progression from situation → actions → results. Smooth transitions between sections.",
        },
        {
            category: "Communication & Delivery",
            metric: "Concise and Appropriate Length (ideally ≤2 min)",
            score: 8,
            comments:
                "Response was well-paced and appeared to be around 1.5–2 minutes. Good balance of detail without being verbose.",
        },
        {
            category: "Communication & Delivery",
            metric: "Minimal Filler Words and Verbal Tics",
            score: 7,
            comments:
                "A few instances of 'um' and 'like' at T3 and T9, but generally clean delivery. Could practice reducing these further.",
        },
        {
            category: "Professionalism & Mindset",
            metric: "Uses Positive/Constructive Framing",
            score: 9,
            comments:
                "Challenges framed as learning opportunities. No negative language about team or prior experiences. Maintained constructive tone throughout.",
        },
        {
            category: "Professionalism & Mindset",
            metric: "Demonstrates Relevant Skills/Competencies",
            score: 9,
            comments:
                "Clearly showcased technical skills, problem-solving, and collaboration abilities. Relevant competencies for the target role.",
        },
        {
            category: "Professionalism & Mindset",
            metric: "Shows Growth and Self-Awareness",
            score: 7,
            comments:
                "Some self-awareness shown at T12 regarding lessons learned. Could demonstrate more reflection on what would be done differently.",
        },
        {
            category: "Professionalism & Mindset",
            metric: "Maintains Professional Tone",
            score: 10,
            comments:
                "Consistently professional throughout. Appropriate formality level for interview context. No overly casual language.",
        },
        {
            category: "RED_FLAGS",
            metric: "Interview Red Flags Summary",
            score: 0,
            comments:
                "• No significant red flags detected.\n• Minor verbal filler words but not excessive.\n• Overall strong performance.",
        },
    ];

    return NextResponse.json(analysis);
}
