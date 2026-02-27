---
name: practice-skill-researcher
description: Tavily-first workflow for converting any requested practice topic into a complete, coaching-ready skill pack with research notes, source links, drills, and a scoring rubric. Use when a user asks to practice something new (interviews, communication, leadership, technical explanations, negotiation, or role-play) and you need a structured, evidence-backed practice plan.
---

# Practice Skill Researcher

## Overview

Generate a full practice package for a specific topic before coaching begins.  
Every practice request starts with Tavily research, then becomes a reusable `SKILL.md` tailored to that topic.

## Required Workflow

1. Capture the practice brief:
- Topic to practice
- Audience or role context
- User goal for the session
- Time available

2. Run Tavily-driven research package generation:
```bash
python3 scripts/build_practice_skill.py "<practice-topic>" \
  --audience "<audience>" \
  --goal "<goal>" \
  --output-dir "<target-folder>"
```

3. Review generated artifacts:
- `SKILL.md` for practice execution
- `research.md` for synthesis and evidence
- `sources.json` for machine-readable source inventory

4. Run the practice using the generated skill:
- Use the generated drills and rubric.
- Coach turn-by-turn.
- Score the user with the rubric and provide actionable next reps.

5. Iterate:
- If the user changes target role, level, or goal, rerun research to refresh evidence and prompts.

## Commands

Basic run:
```bash
python3 scripts/build_practice_skill.py "behavioral interview storytelling"
```

Higher-quality run with explicit context:
```bash
python3 scripts/build_practice_skill.py "system design interview" \
  --audience "senior backend engineer candidate" \
  --goal "improve tradeoff communication and structured answers" \
  --max-results 7 \
  --min-unique-sources 10
```

Pin trusted domains:
```bash
python3 scripts/build_practice_skill.py "salary negotiation role play" \
  --include-domains "hbr.org,indeed.com,glassdoor.com"
```

## Output Contract

The generated package must include:
- Practical session flow (start, drills, debrief)
- Topic-specific drills and prompts
- Coaching rubric with scoring criteria
- Common mistakes and corrective guidance
- Evidence-backed notes mapped to sources
- Clickable source list for auditability

See [references/output-spec.md](references/output-spec.md) for details.

## Failure Handling

If `TAVILY_API_KEY` is missing or invalid:
- Stop and report the exact issue.
- Ask for a valid key or an explicit override to continue without Tavily.
- Do not fabricate sources.

## Resources

- `scripts/build_practice_skill.py`: Tavily search + package generator.
- `references/output-spec.md`: required sections and quality gates for generated output.
