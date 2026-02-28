import { NextRequest, NextResponse } from "next/server";

type Turn = {
  id: number;
  speaker: string;
  text: string;
};

type ScoreItem = {
  category: string;
  metric: string;
  score: number;
  comments: string;
};

function parseTurns(transcript: string): Turn[] {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^T(\d+)\s+\(([^)]+)\):\s*(.*)$/);
      if (!match) return null;

      return {
        id: Number(match[1]),
        speaker: match[2],
        text: match[3],
      };
    })
    .filter((turn): turn is Turn => turn !== null);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function countWords(text: string): number {
  const words = text.match(/[A-Za-z0-9']+/g);
  return words ? words.length : 0;
}

function isCandidateSpeaker(speaker: string): boolean {
  const value = speaker.toLowerCase();
  return value.includes("candidate") || value.includes("user");
}

function isInterviewerSpeaker(speaker: string): boolean {
  const value = speaker.toLowerCase();
  return value.includes("interviewer") || value.includes("agent");
}

function buildScores(turns: Turn[]): ScoreItem[] {
  const candidateTurns = turns.filter((turn) => isCandidateSpeaker(turn.speaker));
  const candidateText = candidateTurns.map((turn) => turn.text).join(" ");
  const candidateTextLower = candidateText.toLowerCase();

  const totalCandidateWords = countWords(candidateText);
  const hasNumbers = /\d/.test(candidateTextLower);
  const hasContext = /(project|team|company|role|internship|when|at|in my role)/.test(
    candidateTextLower
  );
  const hasActions = /(i|we)\s+(built|designed|created|implemented|led|managed|fixed|resolved|improved|delivered)/.test(
    candidateTextLower
  );
  const hasResults = /(result|impact|improved|reduced|increased|achieved|delivered|saved)/.test(
    candidateTextLower
  );
  const hasLearning = /(learned|next time|would do differently|reflection|takeaway|improve)/.test(
    candidateTextLower
  );
  const fillerCount =
    candidateTextLower.match(/\b(um|uh|like|you know|sort of|kind of)\b/g)?.length ??
    0;
  const hasPositiveFraming =
    /(learned|improved|collaborated|supported|ownership|growth)/.test(
      candidateTextLower
    );
  const hasNegativeLanguage = /(stupid|dumb|lazy|hate|blame)/.test(candidateTextLower);
  const isVerbose = totalCandidateWords > 450;
  const isTooShort = totalCandidateWords < 80;

  const baseCompleteness = hasContext && hasActions && hasResults ? 8.1 : 6.2;
  const baseQuality = hasNumbers ? 8.2 : 6.4;
  const baseCommunication = isVerbose ? 5.5 : 7.5;
  const baseProfessionalism = hasPositiveFraming ? 8.1 : 6.8;

  const scores: ScoreItem[] = [
    {
      category: "Answer Completeness",
      metric: "Provides Context/Background",
      score: clampScore(baseCompleteness + (hasContext ? 1.2 : -1.6)),
      comments: hasContext
        ? "Context was present in multiple turns (for example T1), which helped frame the situation clearly."
        : "Context was limited, so the setup felt unclear in early turns such as T1.",
    },
    {
      category: "Answer Completeness",
      metric: "Explains Actions Taken",
      score: clampScore(baseCompleteness + (hasActions ? 1.3 : -2.0)),
      comments: hasActions
        ? "You described concrete actions (for example T2), which made ownership clear."
        : "Action details were sparse, so it was hard to understand what you specifically did (for example T2).",
    },
    {
      category: "Answer Completeness",
      metric: "States Clear Results/Outcomes",
      score: clampScore(baseCompleteness + (hasResults ? 1.2 : -2.0) + (hasNumbers ? 0.7 : 0)),
      comments: hasResults
        ? "Results were stated (for example T3), and the outcome was understandable."
        : "Outcomes were not clearly stated, so impact remained vague by the end of the response.",
    },
    {
      category: "Answer Completeness",
      metric: "Includes Learning/Reflection (when applicable)",
      score: clampScore(baseCompleteness + (hasLearning ? 0.8 : -1.6)),
      comments: hasLearning
        ? "You included reflection and learning, which strengthened the close of the answer."
        : "Reflection was limited; add what you learned or what you would do differently.",
    },
    {
      category: "Response Quality & Specificity",
      metric: "Uses Specific Concrete Examples",
      score: clampScore(baseQuality + (hasActions ? 0.9 : -1.4)),
      comments: "Concrete examples were used in parts of the transcript, but specificity can still improve with tighter details.",
    },
    {
      category: "Response Quality & Specificity",
      metric: "Provides Relevant Details and Evidence",
      score: clampScore(baseQuality + (hasNumbers ? 1.0 : -1.3)),
      comments: hasNumbers
        ? "You included measurable evidence, which improved credibility."
        : "Try adding measurable evidence (metrics, scale, timeframe) to support your points.",
    },
    {
      category: "Response Quality & Specificity",
      metric: "Stays On Topic and Focused",
      score: clampScore(baseQuality + (isVerbose ? -1.8 : 0.6)),
      comments: isVerbose
        ? "Some sections ran long and reduced focus. Tighten structure to keep relevance high."
        : "The response generally stayed on topic and was easy to follow.",
    },
    {
      category: "Response Quality & Specificity",
      metric: "Answers Question Fully and Directly",
      score: clampScore(baseQuality + (isTooShort ? -1.6 : 0.7)),
      comments: isTooShort
        ? "Coverage was brief and likely under-developed. Expand direct answer depth."
        : "The question was answered directly with sufficient breadth for most interview contexts.",
    },
    {
      category: "Communication & Delivery",
      metric: "Clear and Articulate",
      score: clampScore(baseCommunication + (fillerCount > 8 ? -1.5 : 0.8)),
      comments: fillerCount > 8
        ? "Frequent filler words reduced clarity. Slow down slightly and pause between points."
        : "Communication was clear overall with understandable phrasing.",
    },
    {
      category: "Communication & Delivery",
      metric: "Well-Structured with Logical Flow",
      score: clampScore(baseCommunication + (hasContext && hasActions && hasResults ? 1.0 : -1.0)),
      comments: hasContext && hasActions && hasResults
        ? "The response showed a clear beginning-middle-end flow."
        : "Structure was uneven. Use a simple context-action-result sequence for consistency.",
    },
    {
      category: "Communication & Delivery",
      metric: "Concise and Appropriate Length (ideally ≤2 min)",
      score: clampScore(baseCommunication + (isVerbose ? -2.2 : 1.0)),
      comments: isVerbose
        ? "Response length appeared excessive for interview pacing. Trim repeated details."
        : "Length looked appropriate for interview pacing.",
    },
    {
      category: "Communication & Delivery",
      metric: "Minimal Filler Words and Verbal Tics",
      score: clampScore(baseCommunication + (fillerCount > 8 ? -2.0 : 1.1)),
      comments:
        fillerCount > 8
          ? "Filler words appeared often. Practice concise pauses to reduce verbal tics."
          : "Filler words were limited and did not materially distract.",
    },
    {
      category: "Professionalism & Mindset",
      metric: "Uses Positive/Constructive Framing",
      score: clampScore(baseProfessionalism + (hasPositiveFraming ? 1.0 : -1.3) + (hasNegativeLanguage ? -1.8 : 0)),
      comments: hasNegativeLanguage
        ? "Some language may come across negatively. Reframe challenges with constructive tone."
        : "Tone was mostly constructive and professional.",
    },
    {
      category: "Professionalism & Mindset",
      metric: "Demonstrates Relevant Skills/Competencies",
      score: clampScore(baseProfessionalism + (hasActions ? 0.9 : -1.3)),
      comments: "Competencies are visible, but you can strengthen this by naming technical and behavioral strengths explicitly.",
    },
    {
      category: "Professionalism & Mindset",
      metric: "Shows Growth and Self-Awareness",
      score: clampScore(baseProfessionalism + (hasLearning ? 1.1 : -1.4)),
      comments: hasLearning
        ? "Growth mindset appeared clearly through reflection."
        : "Include one explicit lesson learned to show stronger self-awareness.",
    },
    {
      category: "Professionalism & Mindset",
      metric: "Maintains Professional Tone",
      score: clampScore(baseProfessionalism + (hasNegativeLanguage ? -2.0 : 1.0)),
      comments: hasNegativeLanguage
        ? "Some phrases risk sounding unprofessional. Use neutral, objective language."
        : "Tone was professional throughout the transcript.",
    },
  ];

  const redFlags: string[] = [];
  if (isVerbose) redFlags.push("• Response length was likely too long for interview format.");
  if (fillerCount > 8) redFlags.push("• Frequent filler words reduced clarity.");
  if (hasNegativeLanguage) redFlags.push("• Some language may be interpreted as negative.");
  if (redFlags.length === 0) {
    redFlags.push("• No significant red flags detected.");
  }

  scores.push({
    category: "RED_FLAGS",
    metric: "Interview Red Flags Summary",
    score: 0,
    comments: redFlags.join("\n"),
  });

  return scores;
}

function buildEvidence(turns: Turn[]) {
  const sampled = turns.slice(0, 8);
  const candidateTurns = turns.filter((turn) => isCandidateSpeaker(turn.speaker));
  const interviewerTurns = turns.filter((turn) =>
    isInterviewerSpeaker(turn.speaker)
  );

  return {
    events: sampled.map((turn) => ({
      event_type: isCandidateSpeaker(turn.speaker)
        ? "CANDIDATE_TURN"
        : isInterviewerSpeaker(turn.speaker)
          ? "INTERVIEWER_TURN"
          : "OTHER_TURN",
      category: "Transcript",
      turn_ids: [turn.id],
      quote: turn.text,
      context_summary: `${turn.speaker} spoke at T${turn.id}.`,
    })),
    summary_counts: {
      total_turns: turns.length,
      candidate_turns: candidateTurns.length,
      interviewer_turns: interviewerTurns.length,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transcript: string | undefined = body.transcript;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Request body must include a `transcript` string." },
        { status: 400 }
      );
    }

    const turns = parseTurns(transcript);
    const evidence = buildEvidence(turns);
    const scores = buildScores(turns);

    return NextResponse.json({ evidence, scores });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Evaluate endpoint error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
