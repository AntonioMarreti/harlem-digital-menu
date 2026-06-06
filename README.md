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

### Pilot hardening status

The current pilot branch includes:

- server-side order totals and idempotent order submit;
- mandatory table/session ownership checks for guest write and session endpoints;
- protected staff routes with shared `STAFF_ACCESS_CODE` login;
- safe session move, release, and close flows;
- DB-level one active session per table;
- stale, closed, and moved guest session UX handling;
- staff empty-session UX polish;
- safe structured server logs for write, security, and race events.

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
- Staff access for `/staff` is controlled by the server-side `STAFF_ACCESS_CODE` environment variable.

Local `npm run build` and `npx tsc --noEmit` should not require a database connection. The database is required when runtime API endpoints are called, for example from `/t/demo` or `/staff`.

We do not run a local database for this MVP, and Docker is not required.

## API Overview

Implemented API routes include:

- `GET /api/tables/[tableId]/session`
- `POST /api/tables/[tableId]/session/close`
- `POST /api/orders`
- `GET /api/table-sessions/[tableSessionId]/orders`
- `GET /api/table-sessions/[tableSessionId]/bill`
- `POST /api/staff/auth/login`
- `POST /api/staff/auth/logout`
- `GET /api/staff/orders`
- `PATCH /api/staff/orders/[orderId]`
- `GET /api/staff/table-sessions`
- `GET /api/staff/tables`
- `PATCH /api/staff/table-sessions/[sessionId]/move`
- `POST /api/staff/table-sessions/[sessionId]/release-empty`
- `GET /api/staff-calls`
- `POST /api/staff-calls`
- `PATCH /api/staff-calls/[callId]`

Public table-level bill lookup is disabled. Public table session rotation with `POST /api/tables/[tableId]/session` is disabled; guest flow uses the safe `GET` session bootstrap and staff uses protected move/release/close endpoints.

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
- `/staff` login needs `STAFF_ACCESS_CODE`.
- Do not commit `.env`, `.env.local`, `.codex.env`, tokens, or secrets.
- Do not print `.codex.env` or other local secret files in logs.
- Do not run `npm audit fix --force` or major Next/React upgrades without a separate migration task.

## Environment

For local runtime API testing against Neon and staff access, create a local `.env.local` from the example file.

```bash
cp .env.example .env.local
```

Then edit `.env.local` locally. Never commit local env files.

Required runtime variables:

- `DATABASE_URL` - required for DB-backed API routes.
- `STAFF_ACCESS_CODE` - required for `/staff` login. This is a server environment variable, not a client-side value. Use a strong non-obvious code, not `1234`, and do not expose the real value in client code, README, screenshots, logs, or commits.

If `STAFF_ACCESS_CODE` is missing, staff access fails closed and `/staff` shows that staff access is not configured. Guest pages can still load, but staff cannot log in until the variable is configured.

Vercel environment checklist:

1. Add `DATABASE_URL` in the Vercel project environment for Production and any Preview environment that should call the database.
2. Add `STAFF_ACCESS_CODE` in the Vercel project environment for `/staff`.
3. Redeploy the affected Production or Preview deployment after changing Vercel environment variables.

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
npm run db:seed:tables
```

`db:migrate`, `db:seed`, and `db:seed:tables` require `DATABASE_URL`. Use them only when intentionally applying changes to the configured Neon database.

GitHub Actions:

- `Database setup` runs migrations and can optionally run seed data.
- For production migration PRs, run `Database setup` with `run_seed=false` unless seed data is intentionally required.
- `Seed pilot tables` seeds the real pilot table records such as `h01`-`h10`.

Do not run seed workflows against production without an explicit operational reason.

## Demo Checklist

Before showing the MVP:

1. Open `/staff`.
2. If there are old orders or an old bill, close the active table session from `/staff -> Открытые столы -> Счета с заказами` using the close/free table action.
3. Open `/t/demo`.
4. Add a regular menu item to the cart.
5. Configure a hookah item with strength, taste, and optional notes.
6. Submit the order.
7. On `/staff`, show the order, hookah option lines, status changes, staff calls, and bill/session information.
8. Show `/staff -> Открытые столы -> Открытые QR без заказов` if an empty active QR session exists.
9. At the end, close the bill/free the table session.

## Product Scope

The MVP focuses on:

- QR-based guest menu.
- Table-based ordering.
- Staff order dashboard.
- Hookah preferences in the order flow.
- Staff call buttons.
- Basic bill/session handling.

Postponed features:

- QR/order abuse protection, such as public menu mode plus QR unlock, seating code, or staff confirmation.
- Pilot rehearsal with owner, waiter, and hookah worker.
- Staging/preview DB workflow.
- Distributed staff login rate limit via Redis/KV.
- Dedicated monitoring provider if Vercel logs are not enough.
- Per-user staff roles and audit trail.
- Menu availability/admin toggle.
- Sound or push notifications for staff.
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
