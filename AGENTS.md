# Agent Instructions

This repository is for a pet project: a QR-based digital system for a hookah lounge.

For AI workflow rules specific to this repository, see `docs/ai-workflow.md`.

## General rules

- Do not build the whole product in one task.
- Work in small, reviewable steps.
- Before writing code, propose a plan.
- Prefer MVP-first decisions.
- Do not add payments, POS/cash register integrations, or real external integrations unless explicitly requested.
- Do not commit secrets, tokens, API keys, or `.env` files.
- Do not introduce unnecessary dependencies.
- Keep architecture simple and easy to run locally.
- Create separate branches for separate tasks.
- Do not merge to `main`.
- Do not force-push.
- Do not rewrite large parts of the project without approval.

## Product priorities

1. QR-based guest menu.
2. Table-based ordering.
3. Staff order dashboard.
4. Hookah preferences and guest profile.
5. Staff call buttons.
6. Booking.
7. Loyalty points.
8. Music requests.

## Postponed features

- Real online payments.
- POS/cash register integration.
- Complex analytics.
- AI recommendations.
- Direct music playback integration.
- Multi-location/franchise support.
- Native mobile apps.

## Workflow

Before implementation:

1. Inspect the repository.
2. Explain the proposed plan.
3. List files you expect to change.
4. Keep the task focused.
5. Wait for approval if the task is planning-only.

After implementation:

1. Summarize changed files.
2. Summarize behavior changes.
3. List checks that were run.
4. Mention any risks or follow-up tasks.

## Quality principles

- Keep code simple.
- Prefer readable implementation over clever abstractions.
- Use mobile-first UI for guest screens.
- Staff screens should be fast and clear during a real shift.
- Avoid mandatory login for basic menu browsing.
- Use optional auth for profile, loyalty, booking, and saved preferences.
