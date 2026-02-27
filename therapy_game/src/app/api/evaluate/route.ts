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

const EXTRACTOR_SYSTEM = `You are a forensic behavioral evidence extractor for interview practice evaluation.

Your job is NOT to evaluate or score.

Your job is to extract observable, transcript-grounded evidence events from interview practice sessions that could be used to assess interview response completeness and quality. Students may use STAR (Situation, Task, Action, Result) or CARL (Context, Action, Result, Learning) methods, or simply provide complete answers.

Hard rules:
- Extract only what is explicitly observable in the transcript.
- Every event MUST include turn_ids (from the transcript) and an exact quote copied verbatim from the transcript turn(s).
- Do not infer intent, diagnose, or interpret.
- Do not score.
- If unsure, omit the event.
- Output valid JSON only. No markdown. No commentary.

EVENT TAXONOMY (use only these):

Answer Completeness Components:
CONTEXT_PROVIDED, TASK_PROVIDED, ACTION_PROVIDED, RESULT_PROVIDED, LEARNING_PROVIDED, MISSING_CONTEXT, MISSING_ACTION, MISSING_RESULT, ANSWER_HAS_BEGINNING_MIDDLE_END

Response Quality:
SPECIFIC_EXAMPLE, QUANTIFIABLE_RESULT, CONCRETE_DETAILS, VAGUE_RESPONSE, RAMBLING_RESPONSE, OFF_TOPIC_RESPONSE, INCOMPLETE_ANSWER, SUPERFICIAL_ANSWER, OVERLY_VERBOSE_RESPONSE

Communication Skills:
CLEAR_ARTICULATION, STRUCTURED_RESPONSE, LOGICAL_FLOW, CONFIDENT_DELIVERY, CONCISE_RESPONSE, APPROPRIATE_LENGTH, USES_FILLER_WORDS, UNCLEAR_COMMUNICATION, CONTRADICTORY_STATEMENTS, LOSES_TRAIN_OF_THOUGHT

Professionalism:
POSITIVE_FRAMING, DEMONSTRATES_SKILLS, SHOWS_LEARNING, TAKES_OWNERSHIP, SPEAKS_NEGATIVELY_ABOUT_OTHERS, MAKES_EXCUSES, OVERLY_CASUAL, DEFENSIVE_TONE

Question Handling:
DIRECTLY_ANSWERS_QUESTION, CLARIFIES_QUESTION, AVOIDS_QUESTION, MISUNDERSTANDS_QUESTION, PROVIDES_RELEVANT_CONTEXT

OUTPUT JSON SHAPE (exact):

{
  "events": [
    {
      "event_type": "<EVENT_TYPE>",
      "category": "<Answer Completeness Components | Response Quality | Communication Skills | Professionalism | Question Handling>",
      "turn_ids": [<turn_id>],
      "quote": "Exact verbatim quote from the transcript turn(s).",
      "context_summary": "1 short sentence describing what happened, without judgment."
    }
  ],
  "summary_counts": {
    "CONTEXT_PROVIDED": 0,
    "TASK_PROVIDED": 0,
    "ACTION_PROVIDED": 0,
    "RESULT_PROVIDED": 0,
    "LEARNING_PROVIDED": 0,
    "MISSING_CONTEXT": 0,
    "MISSING_ACTION": 0,
    "MISSING_RESULT": 0,
    "ANSWER_HAS_BEGINNING_MIDDLE_END": 0,
    "SPECIFIC_EXAMPLE": 0,
    "QUANTIFIABLE_RESULT": 0,
    "CONCRETE_DETAILS": 0,
    "VAGUE_RESPONSE": 0,
    "RAMBLING_RESPONSE": 0,
    "OFF_TOPIC_RESPONSE": 0,
    "INCOMPLETE_ANSWER": 0,
    "SUPERFICIAL_ANSWER": 0,
    "OVERLY_VERBOSE_RESPONSE": 0,
    "CLEAR_ARTICULATION": 0,
    "STRUCTURED_RESPONSE": 0,
    "LOGICAL_FLOW": 0,
    "CONFIDENT_DELIVERY": 0,
    "CONCISE_RESPONSE": 0,
    "APPROPRIATE_LENGTH": 0,
    "USES_FILLER_WORDS": 0,
    "UNCLEAR_COMMUNICATION": 0,
    "CONTRADICTORY_STATEMENTS": 0,
    "LOSES_TRAIN_OF_THOUGHT": 0,
    "POSITIVE_FRAMING": 0,
    "DEMONSTRATES_SKILLS": 0,
    "SHOWS_LEARNING": 0,
    "TAKES_OWNERSHIP": 0,
    "SPEAKS_NEGATIVELY_ABOUT_OTHERS": 0,
    "MAKES_EXCUSES": 0,
    "OVERLY_CASUAL": 0,
    "DEFENSIVE_TONE": 0,
    "DIRECTLY_ANSWERS_QUESTION": 0,
    "CLARIFIES_QUESTION": 0,
    "AVOIDS_QUESTION": 0,
    "MISUNDERSTANDS_QUESTION": 0,
    "PROVIDES_RELEVANT_CONTEXT": 0
  }
}

Notes:
- category must be one of: "Answer Completeness Components", "Response Quality", "Communication Skills", "Professionalism", "Question Handling"
- If there are no events, return events: [] and leave all counts at 0.
- CONCISE_RESPONSE and APPROPRIATE_LENGTH apply when responses are focused and efficient (ideally under 2 minutes worth of content)
- OVERLY_VERBOSE_RESPONSE applies when responses are excessively long, repetitive, or contain unnecessary details`;

// ── Step 2 prompt ──────────────────────────────────────────────────────────

const SCORER_SYSTEM = `You are an interview coach scoring a student's interview practice session using explicit transcript evidence.

If company name and/or job role are provided, consider how well the responses are tailored to that specific context (e.g., relevant skills for the role, knowledge about the company). However, focus primarily on the quality and completeness of responses.

You MUST score every subsection listed below and output EXACTLY the schema required.

Scoring scale:
0.0 = Not demonstrated / Poor
1.0 = Partially demonstrated / Needs improvement
2.0 = Well demonstrated / Strong performance

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
- comments should be 2-5 sentences providing specific, actionable feedback.
- If insufficient evidence exists, score must be 0.0.
- Focus on substance and content quality, not personality or charm.
- Use only: 1) the transcript, 2) the extracted evidence events JSON.
- IMPORTANT: Interview best practice is to keep responses to 2 minutes or less. Penalize overly verbose, rambling, or excessively long responses.

SUBSECTIONS TO SCORE:

I1 — Answer Completeness → category = "Answer Completeness"
  I1.1 metric = "Provides Context/Background"
  I1.2 metric = "Explains Actions Taken"
  I1.3 metric = "States Clear Results/Outcomes"
  I1.4 metric = "Includes Learning/Reflection (when applicable)"

  Note: Students may use STAR (Situation, Task, Action, Result) or CARL (Context, Action, Result, Learning) frameworks, or simply provide complete answers. Score based on whether the answer has a clear beginning (context/setup), middle (what they did), and end (outcome/impact), not strict adherence to a specific framework.

I2 — Response Quality & Specificity → category = "Response Quality & Specificity"
  I2.1 metric = "Uses Specific Concrete Examples"
  I2.2 metric = "Provides Relevant Details and Evidence"
  I2.3 metric = "Stays On Topic and Focused"
  I2.4 metric = "Answers Question Fully and Directly"

I3 — Communication & Delivery → category = "Communication & Delivery"
  I3.1 metric = "Clear and Articulate"
  I3.2 metric = "Well-Structured with Logical Flow"
  I3.3 metric = "Concise and Appropriate Length (ideally ≤2 min)"
  I3.4 metric = "Minimal Filler Words and Verbal Tics"

I4 — Professionalism & Mindset → category = "Professionalism & Mindset"
  I4.1 metric = "Uses Positive/Constructive Framing"
  I4.2 metric = "Demonstrates Relevant Skills/Competencies"
  I4.3 metric = "Shows Growth and Self-Awareness"
  I4.4 metric = "Maintains Professional Tone"

RED FLAGS REQUIREMENT (must always append at end):
  category = "RED_FLAGS"
  metric = "Interview Red Flags Summary"
  score = 0
  comments = 0-5 brief bullet points (each bullet should include a turn ID if applicable)
  If no red flags: comments = "• No significant red flags detected."

Red flags include (non-exhaustive): speaking negatively about others (previous employers, colleagues, teammates), making excuses or deflecting responsibility, being overly casual or unprofessional, avoiding or dodging questions, contradictory statements, vague or rambling responses without substance, overly verbose responses (significantly exceeding 2 minutes), failure to answer questions directly, defensive tone, inappropriate content, losing train of thought repeatedly.`;

function buildScorerUser(
  evidenceJson: string,
  transcriptTurns: string,
  company?: string,
  jobRole?: string
): string {
  const contextInfo = company || jobRole
    ? `\n0) Interview Context:\n${jobRole ? `Position: ${jobRole}` : ''}${jobRole && company ? '\n' : ''}${company ? `Company: ${company}` : ''}\n`
    : '';

  return `${contextInfo}1) Extracted evidence events JSON:
${evidenceJson}

2) Transcript turns:
${transcriptTurns}

Return a JSON array with objects in this exact order:
1-4: category "Answer Completeness" with its 4 metrics
5-8: category "Response Quality & Specificity" with its 4 metrics
9-12: category "Communication & Delivery" with its 4 metrics
13-16: category "Professionalism & Mindset" with its 4 metrics
17: the RED_FLAGS object`;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transcript: string | undefined = body.transcript;
    const company: string | undefined = body.company;
    const jobRole: string | undefined = body.jobRole;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Request body must include a `transcript` string." },
        { status: 400 }
      );
    }

    console.log(`[evaluate] len(transcript) = ${transcript.length}${company ? `, company: ${company}` : ''}${jobRole ? `, role: ${jobRole}` : ''}`);

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
    const scorerUserPrompt = buildScorerUser(evidenceJson, transcript, company, jobRole);
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
