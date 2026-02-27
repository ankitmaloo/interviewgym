import { NextRequest, NextResponse } from "next/server";

const MINIMAX_API_URL = "https://api.minimax.io/v1/text/chatcompletion_v2";
const MINIMAX_MODEL = process.env.MINIMAX_MODEL ?? "MiniMax-M2.5-highspeed";

async function callMinimax(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY is not configured");
  }

  const res = await fetch(MINIMAX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 16384,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`MiniMax API error (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function parseJsonFromLLM(raw: string): unknown {
  let cleaned = raw.trim();

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  return JSON.parse(cleaned);
}

// ── Step 1 prompt ──────────────────────────────────────────────────────────

const EXTRACTOR_SYSTEM = `You are a forensic behavioral evidence extractor for ICF coaching evaluation.

Your job is NOT to evaluate or score.

Your job is to extract observable, transcript-grounded evidence events that could be used to score ICF Core Competencies / PCC markers.

Hard rules:
- Extract only what is explicitly observable in the transcript.
- Every event MUST include turn_ids (from the transcript) and an exact quote copied verbatim from the transcript turn(s).
- Do not infer intent, diagnose, or interpret.
- Do not score.
- If unsure, omit the event.
- Output valid JSON only. No markdown. No commentary.

EVENT TAXONOMY (use only these):

Agreements & Contracting:
SESSION_GOAL_ESTABLISHED, SESSION_GOAL_CLARIFIED, SESSION_AGREEMENT_CONFIRMED, RECONTRACTING_MOMENT, AGENDA_DRIFT, AGENDA_OVERRIDE

Presence & Partnership:
ACKNOWLEDGES_CLIENT_LANGUAGE, LETS_CLIENT_LEAD, INTERRUPTS_CLIENT, COACH_LONG_MONOLOGUE, INVALIDATES_CLIENT, THERAPY_STYLE_INTERPRETATION

Active Listening:
PARAPHRASE_ACCURATE, PARAPHRASE_INACCURATE, REFLECTS_EMOTION, OBSERVES_PATTERN, SUMMARIZES_PROGRESS

Evokes Awareness:
POWERFUL_OPEN_QUESTION, LEADING_QUESTION, STACKED_QUESTION, REFRAME, EXPLORES_BELIEF, EXPLORES_IDENTITY, EXPLORES_EMOTION, CLIENT_INSIGHT, COACH_ACKNOWLEDGES_INSIGHT

Ethics / Red Flags:
ADVICE_GIVING, DIAGNOSIS, MORALIZING, JUDGMENT, COACHING_THERAPY_BOUNDARY_SHIFT

OUTPUT JSON SHAPE (exact):

{
  "events": [
    {
      "event_type": "<EVENT_TYPE>",
      "category": "<Agreements & Contracting | Presence & Partnership | Active Listening | Evokes Awareness | Ethics / Red Flags>",
      "turn_ids": [<turn_id>],
      "quote": "Exact verbatim quote from the transcript turn(s).",
      "context_summary": "1 short sentence describing what happened, without judgment."
    }
  ],
  "summary_counts": {
    "SESSION_GOAL_ESTABLISHED": 0,
    "SESSION_GOAL_CLARIFIED": 0,
    "SESSION_AGREEMENT_CONFIRMED": 0,
    "RECONTRACTING_MOMENT": 0,
    "AGENDA_DRIFT": 0,
    "AGENDA_OVERRIDE": 0,
    "ACKNOWLEDGES_CLIENT_LANGUAGE": 0,
    "LETS_CLIENT_LEAD": 0,
    "INTERRUPTS_CLIENT": 0,
    "COACH_LONG_MONOLOGUE": 0,
    "INVALIDATES_CLIENT": 0,
    "THERAPY_STYLE_INTERPRETATION": 0,
    "PARAPHRASE_ACCURATE": 0,
    "PARAPHRASE_INACCURATE": 0,
    "REFLECTS_EMOTION": 0,
    "OBSERVES_PATTERN": 0,
    "SUMMARIZES_PROGRESS": 0,
    "POWERFUL_OPEN_QUESTION": 0,
    "LEADING_QUESTION": 0,
    "STACKED_QUESTION": 0,
    "REFRAME": 0,
    "EXPLORES_BELIEF": 0,
    "EXPLORES_IDENTITY": 0,
    "EXPLORES_EMOTION": 0,
    "CLIENT_INSIGHT": 0,
    "COACH_ACKNOWLEDGES_INSIGHT": 0,
    "ADVICE_GIVING": 0,
    "DIAGNOSIS": 0,
    "MORALIZING": 0,
    "JUDGMENT": 0,
    "COACHING_THERAPY_BOUNDARY_SHIFT": 0
  }
}

Notes:
- category must be one of: "Agreements & Contracting", "Presence & Partnership", "Active Listening", "Evokes Awareness", "Ethics / Red Flags"
- If there are no events, return events: [] and leave all counts at 0.`;

// ── Step 2 prompt ──────────────────────────────────────────────────────────

const SCORER_SYSTEM = `You are an ICF assessor scoring a coaching transcript using explicit transcript evidence.

You MUST score every subsection listed below and output EXACTLY the schema required.

Scoring scale:
0.0 = Not demonstrated
1.0 = Inconsistent / surface-level
2.0 = Clear, consistent, effective demonstration

IMPORTANT:
- You MUST output scores in the 0.0–2.0 scale with ONE decimal place.
- ALLOWED values: 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0
- You have 21 possible score values. USE THEM. Do NOT cluster around 0.0, 0.5, 1.0, 1.5, 2.0.
- Think of it as a percentage: 1.3 means 65% demonstrated, 0.7 means 35% demonstrated, etc.

Hard rules:
- Output MUST be valid JSON only (a JSON array). No markdown. No commentary.
- Output MUST contain exactly 17 objects: 16 metric objects (4 per section) in the order below, then 1 RED_FLAGS object at the end.
- The only keys allowed in each object are: category, metric, score, comments.
- Every comments must reference at least one turn ID (e.g., "T12").
- comments should be 2-5 sentences.
- If insufficient evidence exists, score must be 0.0.
- Do NOT reward warmth, charisma, confidence, or length.
- Use only: 1) the transcript, 2) the extracted evidence events JSON.

SUBSECTIONS TO SCORE:

A3 — Establishes & Maintains Agreements → category = "Establishes & Maintains Agreements"
  A3.1 metric = "Session Outcome Clarity"
  A3.2 metric = "Partnership in Agreement"
  A3.3 metric = "Maintains Focus on Agreed Outcome"
  A3.4 metric = "Re-contracts When Needed"

A5 — Maintains Presence → category = "Maintains Presence"
  A5.1 metric = "Demonstrates Curiosity"
  A5.2 metric = "Lets Client Lead"
  A5.3 metric = "Responsive to Client Emotions"
  A5.4 metric = "Flexible to What Emerges"

A6 — Listens Actively → category = "Listens Actively"
  A6.1 metric = "Accurate Paraphrasing"
  A6.2 metric = "Reflects Emotion"
  A6.3 metric = "Observes Patterns"
  A6.4 metric = "Integrates Multiple Client Threads"

A7 — Evokes Awareness → category = "Evokes Awareness"
  A7.1 metric = "Uses Powerful Open Questions"
  A7.2 metric = "Explores Beliefs and Identity"
  A7.3 metric = "Encourages New Perspectives"
  A7.4 metric = "Supports Client-Generated Insight"

RED FLAGS REQUIREMENT (must always append at end):
  category = "RED_FLAGS"
  metric = "Session Red Flags Summary"
  score = 0
  comments = 0-5 brief bullet points (each bullet should include a turn ID if applicable)
  If no red flags: comments = "• No significant red flags detected."

Red flags include (non-exhaustive): advice-giving, diagnosis, moralizing / judgment, coaching-therapy boundary shift, agenda override, invalidation, repeated stacked questions / leading questions, excessive coach talk / long monologues.`;

function buildScorerUser(
  evidenceJson: string,
  transcriptTurns: string
): string {
  return `1) Extracted evidence events JSON:
${evidenceJson}

2) Transcript turns:
${transcriptTurns}

Return a JSON array with objects in this exact order:
1-4: category "Establishes & Maintains Agreements" with its 4 metrics
5-8: category "Maintains Presence" with its 4 metrics
9-12: category "Listens Actively" with its 4 metrics
13-16: category "Evokes Awareness" with its 4 metrics
17: the RED_FLAGS object`;
}

// ── Handler ────────────────────────────────────────────────────────────────

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

    console.log(`[evaluate] len(transcript) = ${transcript.length}`);

    // Step 1 — extract evidence
    const t_start_step1 = Date.now();
    const extractorUserPrompt = `Transcript turns:\n${transcript}`;
    const rawEvidence = await callMinimax(
      EXTRACTOR_SYSTEM,
      extractorUserPrompt
    );
    const t_end_step1 = Date.now();
    console.log(`[evaluate] Step 1 (extract): ${t_end_step1 - t_start_step1}ms`);

    let evidence: unknown;
    try {
      evidence = parseJsonFromLLM(rawEvidence);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse evidence extraction response as JSON.",
          raw: rawEvidence,
        },
        { status: 502 }
      );
    }

    const evidenceJson = JSON.stringify(evidence, null, 2);
    console.log(`[evaluate] len(evidenceJson) = ${evidenceJson.length}`);

    // Step 2 — score performance
    const t_start_step2 = Date.now();
    const scorerUserPrompt = buildScorerUser(evidenceJson, transcript);
    const rawScores = await callMinimax(SCORER_SYSTEM, scorerUserPrompt);
    const t_end_step2 = Date.now();
    console.log(`[evaluate] Step 2 (score): ${t_end_step2 - t_start_step2}ms`);
    console.log(`[evaluate] Total: ${t_end_step2 - t_start_step1}ms`);

    let scores: unknown;
    try {
      scores = parseJsonFromLLM(rawScores);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse scoring response as JSON.",
          raw: rawScores,
          evidence,
        },
        { status: 502 }
      );
    }

    if (Array.isArray(scores)) {
      scores = scores.map((item: Record<string, unknown>) => {
        const score = typeof item.score === "string" ? parseFloat(item.score) : item.score;
        if (typeof score === "number" && Number.isFinite(score)) {
          return { ...item, score: Math.round(score * 5 * 10) / 10 };
        }
        return { ...item, score: 0 };
      });
    }

    return NextResponse.json({ evidence, scores });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Evaluate endpoint error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
