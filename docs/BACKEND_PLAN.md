# Backend & Storage Plan: First Real Order Sync

This document outlines the backend and storage implementation plan for the first real order synchronization milestone: allowing a guest to submit an order from `/t/[tableId]` and staff to see/update it in `/staff`.

## 1. Recommended Storage for Vercel MVP

### Storage Options Comparison

- **SQLite**: Great for local development. However, on Vercel's serverless environment, the filesystem is ephemeral. A local SQLite database file would be reset every time a serverless function spins down, making it unsuitable for persistent production data on Vercel.
- **In-memory store**: Similar to SQLite, Vercel serverless functions are stateless and ephemeral. In-memory data will be lost immediately when the function goes cold, making it impossible to sync reliably between the guest and staff clients.
- **Supabase Postgres**: A very powerful Postgres-as-a-Service with built-in auth and real-time websockets. However, it requires managing a separate platform and might be slightly heavier than needed for a simple MVP focused only on DB storage.
- **Neon / Vercel Postgres**: Vercel Postgres (powered by Neon) is a serverless Postgres offering natively integrated with Vercel. It perfectly matches serverless edge functions, scaling connections efficiently, and requires zero external platform setup since the project is already on Vercel.

**Recommendation**: **Vercel Postgres (Neon)**. It provides persistent storage without the ephemeral filesystem limits of SQLite, and is the easiest to provision and integrate securely within an existing Vercel project without adding complex third-party setups.

### ORM: Prisma vs Drizzle

- **Prisma**: Very popular, great schema definition, but can be heavy for serverless edges and sometimes requires workarounds (Prisma Accelerate) for serverless connection pooling.
- **Drizzle ORM**: Lightweight, highly performant on serverless edges (edge-compatible out of the box), SQL-like syntax, and pairs extremely well with Vercel Postgres.

**Recommendation**: **Drizzle ORM**. For this Next.js App Router project deployed on Vercel, Drizzle offers better serverless compatibility, smaller bundle sizes, and direct native integration with Vercel Postgres.

## 2. Core Entities

- **Table**: Represents a physical table in the lounge (e.g., Table 1). Has a stable ID and QR code slug.
- **TableSession**: Represents a time-bounded visit at a table. Shared by all guests sitting at that table during their stay.
- **GuestSession or User**: Represents an individual guest's device/browser. Holds personal state (like a draft cart) before it is submitted to the shared TableSession.
- **Order**: A submitted collection of items by a guest, tied to the active TableSession.
- **OrderItem**: Individual items within an order (e.g., a specific hookah configuration, tea).
- **StaffCall**: A request for staff assistance (e.g., "call waiter", "replace coals", "bill"), tied to the active TableSession.
- **MenuItem Source**: Tracks the origin of the menu item (e.g., `harlem`, `craft_beery`). The UI uses this to distinguish and label items originating from external/partner sources in the cart and order summaries.

## 3. Table Session Lifecycle

The Table Session Model differentiates between permanent physical tables and time-bounded visits.

- **Creation**: When a guest opens a table QR link (`/t/[tableId]`), the system checks for an active `TableSession`. If none exists, a new active `TableSession` is created.
- **Handling Orders**: All submitted orders and staff calls are attached to this specific active `TableSession` ID, not just the physical table ID.
- **Closing**: When guests leave or pay the bill, staff clicks "Close Session" in the `/staff` dashboard. The `TableSession` is marked as closed.
- **Re-opening (New Guests)**: When new guests sit at the same physical table later and scan the QR code, the system sees there is no active session and creates a new one.
- **Preventing Stale Orders**: A guest's browser keeps the `TableSession` ID when they start ordering. If they try to submit an order but the session has been closed by staff, the API will reject the order with a "session expired" error, prompting the guest to refresh and join the new session.

## 4. API Routes

Minimal API routes required for the first real sync:

- `GET /api/tables/[tableId]/session`: Fetch the active session for a table (or create one if none exists).
- `POST /api/tables/[tableId]/session`: Explicitly create or rotate a session.
- `POST /api/orders`: Submit a new order (attached to `tableSessionId`).
- `GET /api/staff/orders`: Fetch active orders (filtered by active table sessions).
- `PATCH /api/staff/orders/[orderId]`: Update order status (e.g., accepted, ready, delivered).
- `POST /api/staff-calls`: Submit a new staff call (e.g., waiter, coals).
- `GET /api/staff-calls`: Fetch active staff calls for the dashboard.
- `PATCH /api/staff-calls/[callId]`: Mark a staff call as handled.

## 5. Guest Flow

1. **Guest opens `/t/[tableId]`**: They scan the QR code.
2. **System resolves active table session**: The frontend calls `GET /api/tables/[tableId]/session`.
3. **Guest keeps personal draft cart locally**: Items are added to a local state cart (GuestSession level) so they don't overwrite other guests at the same table.
4. **Guest submits order**: The cart payload is sent to `POST /api/orders` along with the active `tableSessionId`.
5. **Order is stored**: The backend saves the `Order` and `OrderItems` under the `TableSession`.
6. **Guest sees active order status**: The guest UI polls or refreshes to show their submitted order status changing over time.

## 6. Staff Flow

1. **Staff opens `/staff`**: They load the staff dashboard.
2. **Staff sees active table sessions/orders**: The frontend calls `GET /api/staff/orders` and `GET /api/staff-calls`.
3. **Staff updates statuses**: Staff clicks to accept or complete an order, sending a request to `PATCH /api/staff/orders/[orderId]`.
4. **Staff handles calls**: Staff marks a call for coals as completed via `PATCH /api/staff-calls/[callId]`.
5. **Staff closes table session**: Once the guests leave, staff clicks "Close Table", which closes the `TableSession` and clears the table for the next guests.

## 7. Implementation Milestones

Backend implementation will be split into small, reviewable PRs without breaking the current UI mock state until everything is ready.

- **PR 1: Database Setup (Done)** - Add Drizzle ORM, Vercel Postgres config, and define the database schema.
- **PR 2: Seed Data** - Add seed scripts for tables, menu items (with sources), and a mock table session.
- **PR 3: Order API Routes** - Implement the API routes for table sessions, orders, and staff calls.
- **PR 4: Connect Guest UI** - Connect the `/t/demo` submit order flow and staff calls to the real API.
- **PR 5: Connect Staff UI** - Connect the `/staff` dashboard to real API endpoints (fetching orders and updating statuses).
- **PR 6: Staff Close-Session Flow** - Add the UI and API connection for staff to close a table session.

## 8. Risks and Postponed Items

To keep the MVP focused strictly on order synchronization, the following items are **postponed**:
- **Auth**: No real user login or staff authentication yet (anyone with the URL can access).
- **Payments**: No online payments.
- **Real POS integration**: No sync with tools like iiko or r_keeper.
- **Real-time updates/WebSockets**: Polling (SWR or React Query) will be used initially instead of WebSockets.
- **Table QR Management**: Generating new QR codes in an admin panel.
- **Admin CRUD**: Real UI for editing menu items or categories.
- **Loyalty**: Points and rewards logic.
- **Music**: Track requests and moderation.