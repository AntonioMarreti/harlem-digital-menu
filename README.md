# Harlem Digital Menu

QR-based digital system for a hookah lounge.

The project starts as a replacement for a static PDF menu opened from table QR codes, but the long-term goal is a full guest, staff, and admin system for a lounge: interactive menu, table-based ordering, hookah preferences, bookings, loyalty points, music requests, and staff dashboards.

## Product idea

Guests scan a QR code at their table and open a mobile-first web app where they can:

- browse an interactive menu instead of PDF files;
- build or order a hookah with preferences;
- add drinks, food, tea, and services to a cart;
- send an order from a specific table;
- call a waiter or hookah master;
- save favorite hookah mixes and personal notes;
- book a table for a future visit;
- collect loyalty points and use them for perks;
- request music in a controlled queue.

Staff members use a dashboard to receive orders, manage statuses, see table numbers, process hookah requests, and handle guest calls.

Managers use an admin panel to edit the menu, manage tables, bookings, staff shifts, stop-list items, loyalty rules, and basic analytics.

## Target users

- Lounge guests
- Waiters
- Hookah masters
- Managers
- Venue owners

## MVP goal

The first MVP should prove the core value:

**QR code → interactive menu → table-based order → staff dashboard → order status → guest preferences.**

The MVP should not try to build the entire ecosystem at once.

## MVP scope

### Guest side

- Mobile-first landing screen for a table QR code.
- Menu categories and menu items.
- Hookah order flow with preferences.
- Cart / draft order.
- Submit order from a specific table.
- Call staff buttons:
  - call waiter;
  - request coals;
  - ask for bill;
  - other help.
- Basic guest profile or local session for favorite hookah preferences.

### Staff side

- Staff dashboard with incoming orders.
- Order details with table number.
- Separate view or filters for:
  - hookah orders;
  - food and drinks;
  - staff calls.
- Order statuses:
  - new;
  - accepted;
  - preparing;
  - ready;
  - delivered;
  - cancelled.

### Admin side

- Basic menu management.
- Categories.
- Menu items.
- Prices.
- Availability / stop-list.
- Tables and QR codes.

## Postponed features

These ideas are important but should be postponed until the MVP works:

- real online payments;
- POS/cash register integration;
- complex booking map;
- loyalty economy;
- direct music system integration;
- AI recommendations;
- advanced analytics;
- multi-location/franchise support;
- native mobile apps.

## Suggested tech direction

The final stack can be decided after architecture planning, but the project should prioritize:

- easy local development;
- simple deployment;
- mobile-first UI;
- maintainable architecture;
- clear separation between guest, staff, and admin flows.

Possible stack:

- Next.js / React for the web app;
- PostgreSQL or SQLite for early MVP;
- Prisma or Drizzle for database access;
- simple session-based auth first;
- Telegram login or VK login later;
- PWA support later.

## Repository structure proposal

```text
.
├── README.md
├── AGENTS.md
├── docs/
│   └── PRODUCT.md
├── app/
├── components/
├── lib/
├── db/
└── tests/
```

This structure can change after the first architecture task.

## Development principles

- MVP first.
- Small reviewable changes.
- One module per task.
- No real secrets in the repository.
- No real payment integrations until explicitly requested.
- No large rewrites without approval.
- Guest experience must be fast and mobile-friendly.
- Staff dashboard must be simple enough to use during a real shift.

## First AI-agent task

Before writing code, the first task for Jules or any other coding agent should be planning only:

```text
Read README.md, docs/PRODUCT.md, and AGENTS.md.

Do not write application code yet.

Propose:
1. MVP scope.
2. Tech stack.
3. Database schema.
4. User roles and permissions.
5. Main guest, staff, and admin screens.
6. Implementation milestones.
7. Tasks that can be done in parallel.
8. Risks and postponed features.
```

## Local Development Instructions

1. **Install dependencies:**
   `npm install`

2. **Database Setup (Optional for UI mock):**
   Copy `.env.example` to `.env.local` and add your Vercel Postgres/Neon database URL:
   `cp .env.example .env.local`
   *(You can run `npm run dev` and build the app without a database if you are only working on UI).*

3. **Run the development server:**
   `npm run dev`

3. **Open the app in your browser:**
   - **Main Entry:** http://localhost:3000
   - **Guest Menu Preview:** http://localhost:3000/t/demo
   - **Staff Dashboard Preview:** http://localhost:3000/staff
   - **Admin Panel Preview:** http://localhost:3000/admin

*Note: The current version is a frontend scaffold with mock data. There is no database or authentication yet.*

### Database Management
To generate migrations, run:
`npm run db:generate`

To apply migrations, ensure `.env.local` is set with your database URL, and run:
`npm run db:migrate`

To seed the database with initial demo data, run:
`npm run db:seed`
