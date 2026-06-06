# Implementation Plan: Harlem Digital Menu

> Status: historical implementation plan.
> This document is not the current implementation source of truth.
> See `README.md` for current pilot status and backlog.

This document outlines the implementation plan for the Harlem Digital Menu MVP. It covers the MVP scope, tech stack, database schema, user roles, main screens, development milestones, parallelization opportunities, and postponed features.

Current MVP note: the implemented pilot intentionally differs from parts of this early plan. It uses a shared `STAFF_ACCESS_CODE` staff login, static menu data, real table sessions, real staff dashboard flows, and Neon/Drizzle-backed order/session APIs.

## 1. MVP Scope

The MVP focuses on proving the core value of replacing PDF menus with an interactive ordering and request system.

**Guest Side:**
- Mobile-first landing screen tied to a specific table via QR code.
- Interactive menu browsing (categories and items).
- Hookah order flow with preferences (strength, taste, avoid, comments).
- Cart system to draft and submit orders.
- "Call Staff" actions (Call waiter, request coals, ask for bill, need help).
- Session-based guest profile (anonymous but remembers preferences during the visit).

**Staff Side:**
- Unified staff dashboard showing incoming orders and calls.
- Order details view displaying table number and requested items.
- Filters to separate hookah orders, food/drink orders, and service calls.
- Simple order status management (new, accepted, preparing, ready, delivered, cancelled).

**Admin Side:**
- Basic menu management (CRUD for categories and items, price updates, availability toggles).
- Table management (create tables, generate QR codes).

## 2. Simplest Practical Tech Stack

To prioritize easy local development, simple deployment, and maintainable architecture:

- **Framework:** [Next.js](https://nextjs.org/) (App Router) with React and TypeScript.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) for fast, accessible UI components.
- **Database:** Vercel Postgres (Neon) for persistent storage compatible with serverless environments (see `BACKEND_PLAN.md`).
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/) for lightweight, edge-compatible type-safe database access.
- **State Management:** React Context or Zustand for client-side state (cart, session).
- **Auth:** Historical proposal was `next-auth` or `lucia`. The current MVP uses a shared server-side `STAFF_ACCESS_CODE` for staff access; per-user staff roles are future work.

## 3. Table Session Model

This early plan described the **Table Session Model** as future architecture. It is now implemented in the current MVP. A physical table is permanent, but many different companies can use the same table during one day. Therefore, submitted orders and staff calls must not belong only to the table itself (`tableId`). They belong to an active table session / visit.

- **Stable QR Codes**: Physical table QR codes point to stable URLs (e.g., `/t/[tableId]`) and stay the same across days and visits.
- **Table Sessions**: Each time-bounded visit generates or attaches to an active session for that table. One physical table can have many sessions during one day. A session can be active, closed, cancelled, or expired.
- **Shared State**: Submitted orders, staff calls, active table state, and statuses are tied to the table session and visible to all guests at the table.
- **Personal State**: Pre-submission draft carts are isolated to individual guest/browser sessions so guests do not accidentally overwrite each other's drafts.
- **Profile State**: Loyalty points, favorites, and notes are tied to individual guest profiles.
- **Staff Visibility**: The staff dashboard groups orders and calls by active table session for easier operational flow. Staff should be able to distinguish current guests from previous guests at the same table. Closing a table session should prevent new orders from being added to the old visit.

## 4. Database Schema Proposal

A simplified early schema proposal. The current production schema is in `src/db/schema.ts`; this section is historical and should not be treated as an exact migration plan.

- **`users`**: `id`, `role`, `username`, `password_hash`, `created_at` (for staff/admin).
- **`tables`**: `id`, `name`, `number`, `qr_slug`, `is_active`.
- **`menu_categories`**: `id`, `name`, `sort_order`, `is_active`.
- **`menu_items`**: `id`, `category_id`, `name`, `description`, `price`, `is_available`, `sort_order`.
- **`orders`**: `id`, `table_id`, `guest_session_id`, `status`, `created_at`, `updated_at`.
- **`order_items`**: `id`, `order_id`, `menu_item_id`, `quantity`, `comment`.
- **`hookah_orders`**: `id`, `order_id`, `strength`, `taste_profile`, `avoid_notes`, `comment`.
- **`staff_calls`**: `id`, `table_id`, `type` (waiter, coals, bill, help), `status` (new, handled), `created_at`.

## 5. User Roles and Permissions

- **Guest (Anonymous/Session):** Scans QR, browses menu, submits orders, requests staff assistance. Bound to a specific table session.
- **Waiter:** Logs in to view orders and staff calls, updates order statuses (food/drink focus), marks calls as handled.
- **Hookah Master:** Logs in to view hookah-specific orders, sees guest preferences, updates hookah preparation statuses.
- **Admin/Manager:** Full access. Manages menu items, categories, tables, and staff accounts.

## 6. Main Screens

**Guest Screens:**
1. **Table Landing / Menu:** Displays venue branding, table number, and menu categories/items.
2. **Hookah Builder / Item Detail:** Form to configure hookah preferences or view item details.
3. **Cart & Checkout:** Summary of selected items, comment field, and "Submit Order" button.
4. **Active Session / Order Status:** View current order status and quick buttons to call staff.

**Staff Screens:**
1. **Staff Dashboard:** Auto-refreshing list of incoming requests.
   - Tabs/Filters: All, Hookahs, Food/Drinks, Calls.
2. **Order Detail Modal:** Shows full order contents, table number, and allows status updates.

**Admin Screens:**
1. **Menu Manager:** List and edit view for categories and items.
2. **Table Manager:** List of tables, ability to add new ones, and QR code URL generation.

## 7. Implementation Milestones

- **Milestone 1: Project Scaffold & DB Setup**
  - Initialize Next.js project, Tailwind, and ORM.
  - Define schema and run initial migrations.
- **Milestone 2: Admin Data Management**
  - Build Admin UI to create tables, categories, and menu items.
- **Milestone 3: Guest Menu Browsing**
  - Implement QR route `[tableId]`.
  - Fetch and display menu categories and items.
- **Milestone 4: Cart and Ordering Flow**
  - Client-side cart state.
  - Hookah preference form.
  - Submit order to database.
- **Milestone 5: Staff Dashboard & Status Updates**
  - Build staff view for incoming orders.
  - Implement order status toggles.
- **Milestone 6: Staff Calls**
  - Add quick action buttons for guests.
  - Route calls to the staff dashboard.
- **Milestone 7: Auth & Security**
  - Protect staff and admin routes.
  - Polish session handling for guests.

## 8. Parallelization Opportunities

After **Milestone 1** (scaffolding and DB schema) is complete, multiple agents can work in parallel:
- **Agent A:** Build Admin Menu Management UI (Milestone 2).
- **Agent B:** Build Guest Menu UI and Cart State (Milestones 3 & 4).
- **Agent C:** Build Staff Dashboard UI with mocked data (Milestone 5).
- **Agent D:** Develop the Hookah Preference Form component.

*Coordination note:* All agents must agree on API route contracts and database schema before parallelizing.

## 9. Postponed Features

These features are explicitly excluded from the MVP to maintain focus and delivery speed:
- Real online payments and POS/cash register integrations.
- Complex booking map and reservation system.
- Loyalty economy (points, rewards).
- Music request system.
- Advanced analytics and AI recommendations.
- Multi-location/franchise support.
- Native mobile applications (iOS/Android).
- Push notifications/WebSockets (use simple auto-refresh for MVP dashboard).
