# AI Workflow for Harlem Menu

This document is for Codex, Antigravity, and other AI coding agents working in this repository.

## Scope

Harlem Menu is a Next.js / TypeScript app for QR-based guest ordering, table sessions, staff calls, and staff dashboard workflows. Keep changes small, reviewable, and MVP-first.

Do not add payments, POS/iiko integration, MCP configs, AI agent frameworks, hooks, generated workflow folders, or real external integrations unless explicitly requested.

## Before Work

- Run `git status -sb` before changing files.
- Identify whether the working tree has user changes. Do not revert unrelated user changes.
- Inspect the relevant files before proposing or implementing changes.
- State the plan and the expected files to change before editing.
- Keep one task focused on one issue or one fix.

## Branching

- Use one branch per issue/fix.
- Do not work directly on `main` for implementation tasks.
- Do not merge to `main`.
- Do not force-push.
- Do not combine unrelated UI, API, database, and cleanup changes in one branch.

## Change Safety

- Do not rewrite large parts of the app without explicit approval.
- Prefer existing local patterns over new abstractions.
- Do not introduce new dependencies unless the task clearly needs them.
- Keep guest screens mobile-first.
- Keep staff screens fast, dense, and clear for use during a shift.

## API Rules

- Keep API responses consistent with nearby routes.
- Error responses should use a clear `error` string and, when useful for client flow, a stable `code`.
- Do not leak database errors, env values, staff codes, stack traces, or internal details to clients.
- Preserve expected status codes for validation, not found, conflict, unauthorized, and server errors.
- When changing response shapes, update all affected client code in the same task.

## Drizzle / Neon Rules

- Schema changes belong in `src/db/schema.ts`.
- Generate SQL migrations with `npm run db:generate`.
- Review generated files in `drizzle/` before applying them.
- Treat `npm run db:migrate`, `npm run db:seed`, and `npm run db:seed:tables` as database-changing operations. Run them only with explicit intent and the correct `DATABASE_URL`.
- Do not run seed scripts against production unless explicitly requested.
- Prefer backward-compatible migrations for deployed data.
- Avoid destructive migrations, table drops, enum rewrites, and data backfills without a separate plan and approval.

## Env / Secrets

- Never commit `.env`, `.env.local`, `.codex.env`, tokens, API keys, staff codes, database URLs, or Vercel secrets.
- Do not print local secret files or real env values in logs or responses.
- Keep required variables documented in `.env.example` and README-style docs only with placeholder values.
- `STAFF_ACCESS_CODE` must remain server-side only.

## Vercel Preview

- For UI/API changes, verify the Vercel Preview deployment when available.
- Check that the preview has the required environment variables before testing runtime DB or staff flows.
- Do not assume local success proves preview runtime success.
- For migration PRs, confirm whether preview/production database migration is intended before running database workflows.

## Basic Checks

Run the narrowest useful checks for the change:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

If runtime behavior changed, also smoke test the affected route or screen locally or in preview.

## Guest Order And Table Session Stability

Protect these flows carefully:

- `/t/[tableId]` session bootstrap
- guest order submit
- staff call submit
- bill lookup by table session
- staff order status updates
- staff table session move, close, and release-empty flows

Do not break table/session ownership checks. Preserve moved, closed, expired, and occupied-table handling. Keep idempotent order submission stable.

## Finish Checklist

Before handing off:

- Summarize changed files.
- Summarize behavior changes.
- List checks run and any checks skipped.
- Mention database, env, Vercel, or guest-flow risks.
- Note any follow-up tasks instead of expanding scope.
