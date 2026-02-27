# InterviewGym App

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

- Define target job roles (role, domain, aspiration, location, query, notes)
- Save delivered postings for each target role
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
