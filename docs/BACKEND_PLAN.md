# Backend & Storage Plan: First Real Order Sync

> Status: historical first backend plan. Partially implemented.
> Current source of truth for pilot status is `README.md` and the route files under `src/app/api`.

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
- **Current hardening**: the database enforces at most one active session per table, and guest write/session endpoints require table context so moved or stale tabs cannot write into a session from the wrong table.

## 4. API Routes

Minimal API routes required for the first real sync:

- `GET /api/tables/[tableId]/session`: Fetch the active session for a table (or create one if none exists).
- `POST /api/tables/[tableId]/session`: Disabled; public session rotation is not allowed.
- `POST /api/orders`: Submit a new order (attached to `tableSessionId`; requires `tableIdOrSlug` and `idempotencyKey`; prices are calculated on the server).
- `GET /api/table-sessions/[tableSessionId]/orders`: Fetch guest-visible session orders with table ownership context.
- `GET /api/table-sessions/[tableSessionId]/bill`: Fetch guest-visible session bill with table ownership context.
- `GET /api/staff/orders`: Fetch active orders (filtered by active table sessions).
- `PATCH /api/staff/orders/[orderId]`: Update order status using the validated transition matrix (`new`, `accepted`, `preparing`, `delivered`, `closed`, `cancelled`).
- `POST /api/staff-calls`: Submit a new staff call (e.g., waiter, coals); requires table ownership context.
- `GET /api/staff-calls`: Fetch active staff calls for the dashboard.
- `PATCH /api/staff-calls/[callId]`: Mark a staff call as handled.
- `GET /api/staff/table-sessions`: Fetch active table sessions and empty active QR sessions for the staff dashboard.
- `GET /api/staff/tables`: Fetch staff-visible table state.
- `PATCH /api/staff/table-sessions/[sessionId]/move`: Move an active session to another free table.
- `POST /api/staff/table-sessions/[sessionId]/release-empty`: Release an active session that has no orders.
- `POST /api/tables/[tableId]/session/close`: Protected staff close/free table flow.

Public table-level bill lookup is disabled. Staff routes are protected by staff access.

## 5. Guest Flow

1. **Guest opens `/t/[tableId]`**: They scan the QR code.
2. **System resolves active table session**: The frontend calls `GET /api/tables/[tableId]/session`.
3. **Guest keeps personal draft cart locally**: Items are added to a local state cart (GuestSession level) so they don't overwrite other guests at the same table.
4. **Guest submits order**: The cart payload is sent to `POST /api/orders` along with the active `tableSessionId`, `tableIdOrSlug`, and an idempotency key.
5. **Order is stored**: The backend verifies the table/session context, recalculates item names/prices/totals from canonical menu data, and saves the `Order` and `OrderItems` under the `TableSession`.
6. **Guest sees active order status**: The guest UI polls or refreshes to show their submitted order status changing over time.

## 6. Staff Flow

1. **Staff opens `/staff`**: They load the staff dashboard.
2. **Staff sees active table sessions/orders**: The frontend calls `GET /api/staff/orders`, `GET /api/staff/table-sessions`, and `GET /api/staff-calls`.
3. **Staff updates statuses**: Staff clicks to accept or complete an order, sending a request to `PATCH /api/staff/orders/[orderId]`.
4. **Staff handles calls**: Staff marks a call for coals as completed via `PATCH /api/staff-calls/[callId]`.
5. **Staff moves or releases sessions**: Staff can move an active session to another free table, release an empty active QR session, or close a bill/session once guests leave.

## 7. Implementation Status

Implemented for the current pilot:

- Drizzle schema, migrations, and Neon-backed runtime API.
- Real seeded tables, including pilot table slugs such as `h01`-`h10`.
- Guest table session bootstrap, cart submit, hookah options, and staff calls.
- Staff dashboard for orders, calls, active bills, empty QR sessions, status changes, move, release, and close flows.
- Server-side order total calculation from canonical menu data.
- Idempotent order submit.
- Mandatory table/session ownership checks for guest endpoints.
- DB-level one active session per table.
- Staff access gate using `STAFF_ACCESS_CODE`.
- Progressive in-memory staff login brute-force protection.
- Safe structured server logs for write, security, and race events.

Remaining / future:

- QR/order abuse protection for physical-presence proof, such as public menu mode plus QR unlock, seating code, or staff confirmation.
- Staging/preview DB workflow.
- Distributed staff login rate limit via Redis/KV.
- Dedicated monitoring provider if Vercel logs are not enough.
- Per-user staff roles and audit trail.
- Staff/admin menu availability controls.
- POS/iiko/payment integration after pilot.

## 8. Risks and Postponed Items

To keep the MVP focused strictly on order synchronization, the following items are **postponed**:
- **Per-user auth and roles**: Current staff access uses a shared `STAFF_ACCESS_CODE`. Per-user accounts, roles, and audit trail are future work.
- **Payments**: No online payments.
- **Real POS integration**: No sync with tools like iiko or r_keeper.
- **Real-time updates/WebSockets**: Polling (SWR or React Query) will be used initially instead of WebSockets.
- **Table QR Management**: Generating new QR codes in an admin panel.
- **Admin CRUD**: Real UI for editing menu items or categories.
- **Loyalty**: Points and rewards logic.
- **Music**: Track requests and moderation.
## 9. API Request/Response Examples

### GET /api/tables/[tableId]/session
Request: `GET /api/tables/demo/session`
Response `200 OK`:
```json
{
  "session": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "tableId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "active",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "closedAt": null
  },
  "table": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Demo Table",
    "qrSlug": "demo",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### POST /api/tables/[tableId]/session
Public session rotation is disabled.

Request: `POST /api/tables/demo/session`
Response `405 Method Not Allowed`:
```json
{
  "error": "Method not allowed"
}
```

### POST /api/orders
The current endpoint ignores client-provided item name, item price, item source, and total amount. It uses `item.id` and `quantity`, looks up canonical menu data on the server, and calculates the total on the server. It also requires `tableIdOrSlug` for ownership checks and `idempotencyKey` for duplicate-submit protection.

Request:
```json
{
  "tableSessionId": "123e4567-e89b-12d3-a456-426614174000",
  "tableIdOrSlug": "demo",
  "guestSessionId": null,
  "idempotencyKey": "guest-generated-submit-key",
  "items": [
    {
      "id": "item_2",
      "quantity": 1,
      "options": {
        "notes": "Без мяты"
      }
    }
  ]
}
```
Response `201 Created`:
```json
{
  "order": {
    "id": "987e6543-e21b-12d3-a456-426614174000",
    "tableSessionId": "123e4567-e89b-12d3-a456-426614174000",
    "guestSessionId": null,
    "status": "new",
    "totalAmount": 1570,
    "createdAt": "2023-01-01T01:05:00.000Z",
    "updatedAt": "2023-01-01T01:05:00.000Z"
  },
  "items": [
    {
      "id": "111e1111-e11b-11d1-a111-111111111111",
      "orderId": "987e6543-e21b-12d3-a456-426614174000",
      "menuItemId": "item_2",
      "name": "Кальян премиум",
      "source": "harlem",
      "quantity": 1,
      "price": 1290,
      "options": null,
      "createdAt": "2023-01-01T01:05:00.000Z"
    }
  ]
}
```

### GET /api/staff/orders
Request: `GET /api/staff/orders`
Response `200 OK`:
```json
{
  "orders": [
    {
      "id": "987e6543-e21b-12d3-a456-426614174000",
      "status": "new",
      "totalAmount": 1570,
      "createdAt": "2023-01-01T01:05:00.000Z",
      "updatedAt": "2023-01-01T01:05:00.000Z",
      "tableSessionId": "123e4567-e89b-12d3-a456-426614174000",
      "tableId": "123e4567-e89b-12d3-a456-426614174000",
      "tableName": "Demo Table",
      "tableQrSlug": "demo",
      "items": [
        {
          "id": "111e1111-e11b-11d1-a111-111111111111",
          "menuItemId": "item_2",
          "name": "Кальян премиум",
          "source": "harlem",
          "quantity": 1,
          "price": 1290,
          "options": null
        }
      ]
    }
  ]
}
```

### PATCH /api/staff/orders/[orderId]
Valid transitions are enforced by the backend. Current statuses are `new`, `accepted`, `preparing`, `delivered`, `closed`, and `cancelled`.

Request:
```json
{
  "status": "accepted"
}
```
Response `200 OK`:
```json
{
  "order": {
    "id": "987e6543-e21b-12d3-a456-426614174000",
    "status": "accepted",
    "totalAmount": 1570,
    "createdAt": "2023-01-01T01:05:00.000Z",
    "updatedAt": "2023-01-01T01:10:00.000Z"
  }
}
```

### POST /api/staff-calls
The current endpoint requires table ownership context and accepts only whitelisted reasons such as `waiter`, `coals`, `bill`, and `help`.

Request:
```json
{
  "tableSessionId": "123e4567-e89b-12d3-a456-426614174000",
  "tableIdOrSlug": "demo",
  "reason": "waiter"
}
```
Response `201 Created`:
```json
{
  "call": {
    "id": "222e2222-e22b-22d2-a222-222222222222",
    "tableSessionId": "123e4567-e89b-12d3-a456-426614174000",
    "guestSessionId": null,
    "reason": "waiter",
    "status": "new",
    "createdAt": "2023-01-01T01:15:00.000Z",
    "handledAt": null
  }
}
```

### GET /api/staff-calls
Request: `GET /api/staff-calls`
Response `200 OK`:
```json
{
  "calls": [
    {
      "id": "222e2222-e22b-22d2-a222-222222222222",
      "reason": "waiter",
      "status": "new",
      "createdAt": "2023-01-01T01:15:00.000Z",
      "tableSessionId": "123e4567-e89b-12d3-a456-426614174000",
      "tableId": "123e4567-e89b-12d3-a456-426614174000",
      "tableName": "Demo Table",
      "tableQrSlug": "demo"
    }
  ]
}
```

### PATCH /api/staff-calls/[callId]
Request:
```json
{
  "status": "handled"
}
```
Response `200 OK`:
```json
{
  "call": {
    "id": "222e2222-e22b-22d2-a222-222222222222",
    "status": "handled",
    "handledAt": "2023-01-01T01:20:00.000Z"
  }
}
```
