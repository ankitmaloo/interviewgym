# Interview Memory (Neo4j)

This worktree adds a Neo4j-backed memory layer for interview practice.

## What memory tracks

- What the user is good at (`GOOD_AT` relationships)
- What the user needs to improve (`NEEDS_WORK` relationships)
- Previous interviews (`InterviewSession` nodes linked to the user)

## Graph model

- `(:User {id})`
- `(:InterviewSession {id, problemId, problemTitle, difficulty, transcript, overallScore, duration, createdAt})`
- `(:InterviewSkill {name, category})`
- `(:User)-[:COMPLETED]->(:InterviewSession)`
- `(:InterviewSession)-[:EVIDENCES {metric, category, score, feedback, classification, createdAt}]->(:InterviewSkill)`
- `(:User)-[:GOOD_AT {avgScore, samples, lastUpdatedAt}]->(:InterviewSkill)`
- `(:User)-[:NEEDS_WORK {avgScore, samples, lastUpdatedAt}]->(:InterviewSkill)`

## Data flow

1. User finishes a practice call.
2. Existing `/api/evaluate` returns `scores` and `evidence`.
3. Session is saved in local browser storage for dashboard/analytics.
4. New `/api/memory/upsert` stores memory in Neo4j.
5. Dashboard fetches `/api/memory/summary` and renders strengths, weaknesses, and previous interviews.

## Environment variables

Add these to `therapy_game/.env.local`:

- `NEO4J_URI=neo4j+s://<your-instance>.databases.neo4j.io`
- `NEO4J_USERNAME=neo4j`
- `NEO4J_PASSWORD=<your-password>`
- `NEO4J_DATABASE=neo4j` (optional, defaults to `neo4j`)

If these are missing, the app keeps working and memory endpoints return `enabled: false` with a message.
