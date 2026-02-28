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

type PathwayContext = {
  role?: string;
  domain?: string;
  aspiration?: string;
};

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildPathwayLabel(payload: Record<string, unknown>): string | null {
  const pathway =
    payload.pathway && typeof payload.pathway === "object"
      ? (payload.pathway as PathwayContext)
      : null;

  const role =
    readOptionalString(pathway?.role) ?? readOptionalString(payload.focusRole);
  const domain = readOptionalString(pathway?.domain);
  const aspiration = readOptionalString(pathway?.aspiration);

  if (role && domain) return `${role} in ${domain}`;
  if (role) return role;
  if (domain) return domain;
  if (aspiration) return aspiration;
  return null;
}

function assessment(text: string, pathwayLabel: string | null): string {
  if (!pathwayLabel) return `Assessment: ${text}`;
  return `Assessment for selected pathway (${pathwayLabel}): ${text}`;
}

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

function buildScores(turns: Turn[], pathwayLabel: string | null): ScoreItem[] {
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
        ? assessment(
            "Situation setup included enough context to frame scope, constraints, and relevance.",
            pathwayLabel
          )
        : assessment(
            "Situation setup lacked scope, constraints, or stakeholder framing, which reduced clarity.",
            pathwayLabel
          ),
    },
    {
      category: "Answer Completeness",
      metric: "Explains Actions Taken",
      score: clampScore(baseCompleteness + (hasActions ? 1.3 : -2.0)),
      comments: hasActions
        ? assessment(
            "Ownership and decision steps were explicit, making personal contribution clear.",
            pathwayLabel
          )
        : assessment(
            "Action detail was thin, so ownership, decisions, and execution approach were hard to verify.",
            pathwayLabel
          ),
    },
    {
      category: "Answer Completeness",
      metric: "States Clear Results/Outcomes",
      score: clampScore(baseCompleteness + (hasResults ? 1.2 : -2.0) + (hasNumbers ? 0.7 : 0)),
      comments: hasResults
        ? assessment(
            "Outcome and impact were explicit, so result quality was measurable.",
            pathwayLabel
          )
        : assessment(
            "Outcome evidence was limited, so business or team impact remained unclear.",
            pathwayLabel
          ),
    },
    {
      category: "Answer Completeness",
      metric: "Includes Learning/Reflection (when applicable)",
      score: clampScore(baseCompleteness + (hasLearning ? 0.8 : -1.6)),
      comments: hasLearning
        ? assessment(
            "Reflection showed learning and adjustment, strengthening long-term signal.",
            pathwayLabel
          )
        : assessment(
            "Learning signal was limited, so growth in judgment and approach was not well evidenced.",
            pathwayLabel
          ),
    },
    {
      category: "Response Quality & Specificity",
      metric: "Uses Specific Concrete Examples",
      score: clampScore(baseQuality + (hasActions ? 0.9 : -1.4)),
      comments: assessment(
        "Examples were concrete in parts, but sharper operational detail would improve precision.",
        pathwayLabel
      ),
    },
    {
      category: "Response Quality & Specificity",
      metric: "Provides Relevant Details and Evidence",
      score: clampScore(baseQuality + (hasNumbers ? 1.0 : -1.3)),
      comments: hasNumbers
        ? assessment(
            "Quantified evidence improved credibility and made impact easier to evaluate.",
            pathwayLabel
          )
        : assessment(
            "Supporting evidence lacked metrics, scale, or timeframe, reducing confidence in impact.",
            pathwayLabel
          ),
    },
    {
      category: "Response Quality & Specificity",
      metric: "Stays On Topic and Focused",
      score: clampScore(baseQuality + (isVerbose ? -1.8 : 0.6)),
      comments: isVerbose
        ? assessment(
            "Some segments were verbose, which diluted focus on the interview question.",
            pathwayLabel
          )
        : assessment(
            "Response stayed focused on the question and maintained relevance.",
            pathwayLabel
          ),
    },
    {
      category: "Response Quality & Specificity",
      metric: "Answers Question Fully and Directly",
      score: clampScore(baseQuality + (isTooShort ? -1.6 : 0.7)),
      comments: isTooShort
        ? assessment(
            "Coverage was brief and under-developed relative to expected interview depth.",
            pathwayLabel
          )
        : assessment(
            "Question was addressed directly with adequate breadth for interview evaluation.",
            pathwayLabel
          ),
    },
    {
      category: "Communication & Delivery",
      metric: "Clear and Articulate",
      score: clampScore(baseCommunication + (fillerCount > 8 ? -1.5 : 0.8)),
      comments: fillerCount > 8
        ? assessment(
            "Frequent filler language reduced clarity and precision of delivery.",
            pathwayLabel
          )
        : assessment(
            "Delivery was clear, with understandable phrasing and articulation.",
            pathwayLabel
          ),
    },
    {
      category: "Communication & Delivery",
      metric: "Well-Structured with Logical Flow",
      score: clampScore(baseCommunication + (hasContext && hasActions && hasResults ? 1.0 : -1.0)),
      comments: hasContext && hasActions && hasResults
        ? assessment(
            "Answer followed a clear beginning-middle-end structure with logical flow.",
            pathwayLabel
          )
        : assessment(
            "Flow was uneven, and sequencing reduced interview readability.",
            pathwayLabel
          ),
    },
    {
      category: "Communication & Delivery",
      metric: "Concise and Appropriate Length (ideally ≤2 min)",
      score: clampScore(baseCommunication + (isVerbose ? -2.2 : 1.0)),
      comments: isVerbose
        ? assessment(
            "Response length exceeded typical interview pacing and included avoidable repetition.",
            pathwayLabel
          )
        : assessment(
            "Length fit interview pacing and stayed within expected response windows.",
            pathwayLabel
          ),
    },
    {
      category: "Communication & Delivery",
      metric: "Minimal Filler Words and Verbal Tics",
      score: clampScore(baseCommunication + (fillerCount > 8 ? -2.0 : 1.1)),
      comments:
        fillerCount > 8
          ? assessment(
              "Filler density was high enough to distract from content quality.",
              pathwayLabel
            )
          : assessment(
              "Filler usage was limited and did not materially distract from substance.",
              pathwayLabel
            ),
    },
    {
      category: "Professionalism & Mindset",
      metric: "Uses Positive/Constructive Framing",
      score: clampScore(baseProfessionalism + (hasPositiveFraming ? 1.0 : -1.3) + (hasNegativeLanguage ? -1.8 : 0)),
      comments: hasNegativeLanguage
        ? assessment(
            "Language included negative framing that could weaken interviewer confidence.",
            pathwayLabel
          )
        : assessment(
            "Tone remained constructive and professionally framed.",
            pathwayLabel
          ),
    },
    {
      category: "Professionalism & Mindset",
      metric: "Demonstrates Relevant Skills/Competencies",
      score: clampScore(baseProfessionalism + (hasActions ? 0.9 : -1.3)),
      comments: assessment(
        "Competency signal is present, but stronger explicit mapping to role-relevant strengths would improve alignment.",
        pathwayLabel
      ),
    },
    {
      category: "Professionalism & Mindset",
      metric: "Shows Growth and Self-Awareness",
      score: clampScore(baseProfessionalism + (hasLearning ? 1.1 : -1.4)),
      comments: hasLearning
        ? assessment(
            "Growth and self-awareness were evidenced through reflection.",
            pathwayLabel
          )
        : assessment(
            "Self-awareness signal was limited because lessons learned were not explicit.",
            pathwayLabel
          ),
    },
    {
      category: "Professionalism & Mindset",
      metric: "Maintains Professional Tone",
      score: clampScore(baseProfessionalism + (hasNegativeLanguage ? -2.0 : 1.0)),
      comments: hasNegativeLanguage
        ? assessment(
            "Some phrasing risked sounding unprofessional for interview standards.",
            pathwayLabel
          )
        : assessment(
            "Professional tone was maintained throughout the interaction.",
            pathwayLabel
          ),
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
    const payload =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : {};
    const transcript = readOptionalString(payload.transcript);

    if (!transcript) {
      return NextResponse.json(
        { error: "Request body must include a `transcript` string." },
        { status: 400 }
      );
    }

    const turns = parseTurns(transcript);
    const evidence = buildEvidence(turns);
    const pathwayLabel = buildPathwayLabel(payload);
    const scores = buildScores(turns, pathwayLabel);

    return NextResponse.json({ evidence, scores });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Evaluate endpoint error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
