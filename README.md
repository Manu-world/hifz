# Hifz (حفظ) — Arabic Vocabulary Memorization App

Production-minded personal vocabulary trainer built with Next.js App Router + TypeScript.

## Current Status

Implemented and verified:

- Data layer (Prisma + SQLite local, Turso/libSQL production adapter)
- CSV paste import with preview + duplicate handling
- Recall + Reverse practice sessions
- Arabic/English answer normalization + matching
- Leitner-box scheduler ([0, 1, 3, 7, 16, 35] days)
- Session logging + daily streak tracking
- Revise All mode (category-wide review ignoring dueAt/isDone)
- Minimal category management: delete category from home
- PWA installability basics (manifest + icon + minimal service worker registration)

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind v4 + shadcn/ui
- Prisma 7 + @prisma/adapter-libsql + @libsql/client
- Zod, PapaParse, date-fns
- Vitest for unit tests

## Run Locally

1. Install dependencies:

```bash
pnpm install
```

2. Ensure env files exist (`.env` and `.env.local`) with local DB url:

```bash
DATABASE_URL="file:./dev.db"
```

3. Apply migrations locally:

```bash
pnpm prisma:migrate:dev
```

4. Start dev server:

```bash
pnpm dev
```

## Quality Gates

```bash
pnpm vitest run
pnpm lint
pnpm format:check
pnpm build
```

## Route/Feature Map

- `/` category list with actions (Recall, Reverse, Revise All, Delete)
- `/import` CSV import flow (new/existing category)
- `/practice/[categoryId]?mode=recall|reverse[&revise=1]` practice session
- `/api/words/due` due/revision queue fetch
- `/api/progress/answer` scheduler mutation on answer submit
- `/api/progress/[wordId]/done` manual done toggle
- `/api/sessions` create session log
- `/api/sessions/[id]` close session log

## What Is Left (Backlog)

### Production pressing

1. Deploy docs and production runbook

- Vercel env setup
- Turso migration replay workflow
- release checklist

### Functional improvements

3. Category management completion

- rename category UI/action
- optional safe delete confirmation UX

4. Dashboard (minimal)

- due counts, mastered count, streak snapshot

### Deferred larger scope

5. Gamified mode (Word Rush, Type Sprint, Sentence Weaver, XP, achievements)
6. Offline-first IndexedDB cache + outbox sync engine
7. Rich charts/export backup workflows

## Smart Continuation Plan (Credit/Time Efficient)

### Phase A: Ship-to-production core (next)

1. Vercel + Turso deployment runbook and env validation
2. Optional category rename action/UI

### Phase B: Usability upgrade

1. Minimal dashboard tiles
2. Delete confirmation + empty-state polish

### Phase C: Nice-to-have expansion

1. Gamified mode foundation (single mini-game first)
2. XP and achievements

## Known Assumptions

- Recall/Reverse sessions award 0 XP for now.
- Any practice mode counts toward the daily streak.
- Revise All reuses recall mode semantics with `isRevision=true` in `SessionLog`.

## Critical Operational Notes

- DB-backed pages must export:

```ts
export const dynamic = "force-dynamic";
```

Reason: Prisma calls are not `fetch()`, so Next may otherwise prerender stale build-time data.

- Prisma 7 + Turso migrate limitation:
  - `prisma migrate deploy/dev` does not target `libsql://...` directly.
  - Generate local migration SQL first, then replay to Turso:

```bash
cat prisma/migrations/<name>/migration.sql | turso db shell hifz-vocab
```

- Avoid terminal env leakage in persistent shells:
  - prefer one-shot env prefixing over `source .env.turso.local` in a long-lived session.

## Smooth Resume Checklist (Pick Up Later)

When resuming development, do this in order:

1. Run quality baseline:

```bash
pnpm vitest run && pnpm lint && pnpm format:check && pnpm build
```

2. Start Phase A (PWA + deploy docs) only.

- PWA basics are already done in this phase. Continue with deploy docs.

3. Re-run quality gates and smoke test:

- Import CSV
- Recall one correct and one incorrect
- Revise All from home card
- Delete category

4. Commit with one concern per commit:

- `feat: pwa manifest and install assets`
- `docs: deployment runbook for vercel+turso`

5. Then begin Phase B (minimal dashboard).
