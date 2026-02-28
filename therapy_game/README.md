# Interview Gym App

Next.js app for interview practice sessions, evaluation, and analytics.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Memory (Neo4j)

## Role Scout Workflow

A new pre-practice workflow is available at `/roles`:

- Define target job roles (role, domain, aspiration, skill focus, location, query, notes)
- Save delivered postings for each target role
- Pick one posting as primary JD context for interviews
- Run web listening across all active roles via API (`/api/roles/listen`)
- Mark a role as focus, then open `/practice` with that role context

The role data is stored locally in browser storage using:

- `iaso_ai_role_targets_v1`
- `iaso_ai_selected_role_target_v1`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

This worktree adds Neo4j-backed user memory for:

- strengths (`GOOD_AT`)
- weaknesses (`NEEDS_WORK`)
- previous interviews (`InterviewSession`)

Setup and data model details are documented in:

- [`docs/memory.md`](./docs/memory.md)

## New Stack

- `Neo4j`: interview memory graph (`/api/memory/upsert`, `/api/memory/summary`)
- `Tavily`: web search for role scouting (`/api/roles/scout`, `/api/roles/listen`)
- `Yutori`: posting curation over Tavily results (`/api/roles/scout`, `/api/roles/listen`)
- `ElevenLabs`: realtime websocket interviewer conversation (`/api/voice/elevenlabs/session`)
- `Modulate`: async audio upload utilities (`/api/voice/upload`)

### Environment Variables

Add these in `therapy_game/.env.local` (or repo-root `.env`):

```bash
# Neo4j memory
NEO4J_URI=neo4j+s://<instance>.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<password>
NEO4J_DATABASE=neo4j

# Tavily search
TAVILY_API_KEY=<key>

# Yutori curation
YUTORI_API_URL=https://<your-yutori-endpoint>
YUTORI_API_KEY=<key>

# ElevenLabs (recommended server-side keys)
ELEVENLABS_API_KEY=<key>
ELEVENLABS_INTERVIEWER_AGENT_1_EASY=agent_xxxxx
ELEVENLABS_INTERVIEWER_AGENT_1_MEDIUM=agent_xxxxx
ELEVENLABS_INTERVIEWER_AGENT_1_HARD=agent_xxxxx
# ...repeat for scenario ids 2..10
# Optional defaults:
# ELEVENLABS_INTERVIEWER_AGENT_EASY=agent_xxxxx
# ELEVENLABS_INTERVIEWER_AGENT_DEFAULT=agent_xxxxx
#
# Public client-side keys are also supported:
# NEXT_PUBLIC_INTERVIEWER_AGENT_1_EASY=agent_xxxxx
# (legacy NEXT_PUBLIC_AGENT_* keys are still supported)

# Modulate async upload endpoint
MODULATE_API_URL=https://<your-modulate-endpoint>
MODULATE_API_KEY=<key>
```

### Voice Status

- Live interview conversation uses ElevenLabs over websocket.
- Session setup is served by `/api/voice/elevenlabs/session` and prefers signed websocket URLs when `ELEVENLABS_API_KEY` is present.
- Interviewer persona comes from scenario+difficulty agent IDs, plus runtime context from:
  - focused role + skill focus
  - selected primary opening/JD
  - Neo4j strengths/weaknesses summary
- Runtime context is injected through ElevenLabs `dynamicVariables` and `contextualUpdate`.
- Modulate is intentionally not used for live conversation; it is optional async upload/review in the notes panel.
