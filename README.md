# Harlem Digital Menu

MVP of a QR-based digital menu and table ordering system for Harlem Lounge.

Production: https://harlem-digital-menu.vercel.app

The stable local workspace is:

```bash
~/projects/harlem-digital-menu
```

Do not use the old Desktop/iCloud workspace:

```bash
~/Desktop/work/Харлем/InteractiveAPP/harlem-digital-menu
```

## Current MVP

Guests open the table menu, add menu items to a cart, configure hookah options, call staff, and send an order for the active table session.

Staff open the dashboard, see active orders, staff calls, and table sessions, update order and call statuses, and close the bill by freeing the table session.

Main screens:

- `/t/demo` - guest demo table.
- `/staff` - staff dashboard.
- `/admin` - placeholder admin panel.

## Backend Runtime

The project already uses a real backend for the guest and staff MVP flows:

- Next.js App Router API routes.
- Neon Postgres for persistent storage.
- Drizzle ORM for schema, migrations, and database access.
- `DATABASE_URL` for runtime database connections.
- Vercel deployment with `DATABASE_URL` configured in the Vercel environment.

Local `npm run build` and `npx tsc --noEmit` should not require a database connection. The database is required when runtime API endpoints are called, for example from `/t/demo` or `/staff`.

We do not run a local database for this MVP, and Docker is not required.

## API Overview

Implemented API routes include:

- `GET /api/tables/[tableId]/session`
- `POST /api/tables/[tableId]/session/close`
- `POST /api/orders`
- `GET /api/table-sessions/[tableSessionId]/orders`
- `GET /api/table-sessions/[tableSessionId]/bill`
- `GET /api/staff/orders`
- `PATCH /api/staff/orders/[orderId]`
- `GET /api/staff/table-sessions`
- `GET /api/staff-calls`
- `POST /api/staff-calls`
- `PATCH /api/staff-calls/[callId]`

This README intentionally keeps the route contract high level. See the route files under `src/app/api` for implementation details.

## Project Structure

```text
.
├── README.md
├── AGENTS.md
├── docs/
├── drizzle/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── staff/
│   │   └── t/[tableId]/
│   ├── components/
│   ├── db/
│   └── lib/
├── package.json
├── package-lock.json
├── next.config.mjs
├── drizzle.config.ts
└── tsconfig.json
```

## Development Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

- Main entry: http://localhost:3000
- Guest demo table: http://localhost:3000/t/demo
- Staff dashboard: http://localhost:3000/staff
- Admin placeholder: http://localhost:3000/admin

Useful checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Notes:

- Docker is not needed.
- A local database is not required for `tsc` or `build`.
- Runtime API calls need `DATABASE_URL`.
- Do not commit `.env`, `.env.local`, `.codex.env`, tokens, or secrets.
- Do not print `.codex.env` or other local secret files in logs.
- Do not run `npm audit fix --force` or major Next/React upgrades without a separate migration task.

## Environment

For local runtime API testing against Neon, create a local `.env.local` with `DATABASE_URL`.

```bash
cp .env.example .env.local
```

Then edit `.env.local` locally. Never commit local env files.

Vercel runtime uses `DATABASE_URL` configured in the Vercel project environment.

## Database And Seed

Database files:

- Drizzle schema: `src/db/schema.ts`
- Database client: `src/db/index.ts`
- Migration runner: `src/db/migrate.ts`
- Seed script: `src/db/seed.ts`
- SQL migrations: `drizzle/`
- Drizzle config: `drizzle.config.ts`

Available scripts:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:migrate` and `db:seed` require `DATABASE_URL`. Use them only when intentionally applying changes to the configured Neon database.

## Demo Checklist

Before showing the MVP:

1. Open `/staff`.
2. If there are old orders or an old bill, close the active table session from `Счета` using the free/close table action.
3. Open `/t/demo`.
4. Add a regular menu item to the cart.
5. Configure a hookah item with strength, taste, and optional notes.
6. Submit the order.
7. On `/staff`, show the order, hookah option lines, status changes, staff calls, and bill/session information.
8. At the end, close the bill/free the table session.

## Product Scope

The MVP focuses on:

- QR-based guest menu.
- Table-based ordering.
- Staff order dashboard.
- Hookah preferences in the order flow.
- Staff call buttons.
- Basic bill/session handling.

Postponed features:

- Real online payments.
- POS/cash register integration.
- Complex analytics.
- AI recommendations.
- Direct music playback integration.
- Multi-location/franchise support.
- Native mobile apps.

## Development Principles

- MVP first.
- Small reviewable changes.
- One module per task.
- No real secrets in the repository.
- No real payment integrations until explicitly requested.
- No large rewrites without approval.
- Guest experience must be fast and mobile-friendly.
- Staff dashboard must be simple enough to use during a real shift.
