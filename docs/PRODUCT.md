# Product Specification: Harlem Digital Menu

## 1. Overview

Harlem Digital Menu is a QR-based digital system for a hookah lounge.

The current real-world starting point is simple: each table has a QR code that opens a one-page website with buttons linking to PDF menu files.

The product opportunity is to replace this static PDF experience with an interactive guest system that helps guests order faster, helps staff process requests, and helps the venue build loyalty and repeat visits.

The long-term vision is not just a digital menu. It is a lounge operating layer:

- interactive menu;
- table-based ordering;
- hookah preference profiles;
- booking;
- loyalty;
- staff dashboards;
- music requests;
- guest history;
- admin management.

The first version must stay focused and prove the core value.

## 2. Product positioning

### Short description

A mobile-first QR menu and ordering system for a hookah lounge, with staff dashboards, guest preferences, bookings, and loyalty features.

### One-liner

Turn table QR codes into a full digital guest experience for a hookah lounge.

### GitHub repository description

QR-based digital menu and guest ordering system for a hookah lounge: interactive menu, table orders, hookah preferences, bookings, loyalty, and staff dashboard.

### Product name ideas

- Harlem Digital Menu
- Harlem Lounge App
- Harlem QR Lounge
- Harlem Guest System
- Harlem Club Menu
- LoungeOS Harlem

For now, use `Harlem Digital Menu` as the working title.

## 3. Core problem

The venue already uses QR codes, but the current flow is limited:

1. Guest scans QR.
2. Website opens.
3. Guest clicks a button.
4. PDF opens.
5. Guest manually reads the menu.
6. Guest still has to call staff manually.
7. Staff has no structured digital order from that QR session.
8. The venue does not learn guest preferences.

This creates missed opportunities:

- no table-based ordering;
- no personal recommendations;
- no guest history;
- no loyalty flow;
- no booking integration;
- no operational dashboard;
- no analytics;
- no easy menu updates compared with database-managed items.

## 4. Product goals

### Business goals

- Increase guest convenience.
- Reduce friction when ordering.
- Help staff process requests more clearly.
- Make menu updates easier.
- Encourage repeat visits through profiles and loyalty.
- Create a modern digital experience that feels premium.
- Build a product that can later be reused for other lounges.

### Guest goals

- Quickly see the menu from the table.
- Understand what to order.
- Customize a hookah.
- Order without waiting too long.
- Save favorite preferences.
- Repeat previous orders.
- Book a table.
- Get small perks through loyalty points.
- Interact with the venue in a fun way, such as music requests.

### Staff goals

- See new orders clearly.
- Understand which table made the request.
- Separate hookah tasks from waiter tasks.
- Track order statuses.
- See guest comments and preferences.
- Avoid confusion during busy hours.

### Manager goals

- Update menu items and prices.
- Mark unavailable items.
- Manage tables and QR codes.
- Manage bookings.
- Manage staff shifts.
- Configure loyalty rules.
- View basic analytics.

## 5. User roles

### Guest

A guest can:

- open the table QR page;
- browse menu;
- create an order;
- call staff;
- save preferences;
- view loyalty points;
- make bookings;
- request music, if enabled.

Guests may start anonymous. Authorization can be optional in the MVP and required only for profile, loyalty, and booking features.

### Waiter

A waiter can:

- view incoming food/drink/service orders;
- view table number;
- accept or update order status;
- respond to staff calls;
- mark orders as delivered or cancelled.

### Hookah master

A hookah master can:

- view hookah orders;
- see guest preferences;
- see comments like strength, taste, tobacco, bowl, no mint, etc.;
- update hookah order status;
- mark coals replacement requests as handled.

### Manager

A manager can:

- manage menu categories and items;
- edit prices;
- mark items unavailable;
- manage tables;
- manage bookings;
- assign staff shifts;
- configure loyalty rules;
- view basic analytics.

### Owner

An owner can:

- view business analytics;
- manage managers;
- access all settings;
- review product performance.

Owner features can be postponed.

## 6. Guest experience

### 6.1 Entry by QR code

Each physical table should have its own QR code.

Example:

```text
https://harlem.example.com/t/7
```

The app should know:

- table ID;
- table name or number;
- venue ID, if multi-location support is added later;
- current open session, if needed.

On scan, the guest sees:

- venue branding;
- table number;
- main actions:
  - menu;
  - order hookah;
  - call staff;
  - booking;
  - profile / favorites.

### 6.2 Interactive menu

The menu should contain:

- categories;
- items;
- prices;
- descriptions;
- photos, optional for MVP;
- availability;
- tags.

Example categories:

- Hookah
- Tea
- Soft drinks
- Food
- Desserts
- Promotions
- Services

Menu item fields:

- name;
- category;
- description;
- price;
- image;
- availability status;
- tags;
- sort order.

### 6.3 Hookah ordering

Hookah is not just a menu item. It should support preferences.

Possible fields:

- strength: light / medium / strong;
- taste profile:
  - sweet;
  - fresh;
  - sour;
  - berry;
  - citrus;
  - dessert;
  - spicy;
- avoid:
  - mint;
  - citrus;
  - overly sweet;
  - strong tobacco;
- tobacco brand, optional;
- bowl type, optional;
- comment;
- trust the hookah master option.

MVP version can be simple:

- strength;
- taste;
- avoid;
- comment.

### 6.4 Cart and order

Guest can add items to a cart and submit an order.

Order should include:

- table ID;
- items;
- item quantities;
- hookah preferences;
- guest comment;
- created time;
- status.

Payment should be postponed. The first version can be "send order to staff" only.

### 6.5 Staff call buttons

Quick actions:

- Call waiter
- Replace coals
- Ask for bill
- Need help

These requests should appear in the staff dashboard.

### 6.6 Guest profile

Profile can start simple.

MVP profile fields:

- display name;
- favorite strength;
- favorite taste notes;
- disliked tastes;
- favorite hookah note;
- order history, optional.

Later:

- Telegram/VK login;
- loyalty points;
- favorite table;
- birthday;
- personal offers;
- saved pre-order templates.

### 6.7 Booking

Booking should be a later MVP+ module.

Fields:

- date;
- time;
- guests count;
- preferred zone/table;
- name;
- phone or messenger contact;
- comment;
- occasion;
- pre-order preferences.

Interactive map can be postponed. Start with simple table/zone selection.

### 6.8 Loyalty

Loyalty can include:

- points for visits;
- points for orders;
- points for reviews;
- points for inviting friends;
- birthday bonus;
- perks.

Perks:

- tea discount;
- free tea;
- hookah upgrade;
- music request;
- priority booking;
- special offer.

This should be postponed until ordering and profiles work.

### 6.9 Music requests

Music requests should be controlled, not direct playback.

Safe model:

- guest requests a track;
- request enters moderation queue;
- staff approves/rejects;
- optional voting;
- points can be spent on priority.

Avoid direct integration with speakers in the MVP.

## 7. Staff experience

### 7.1 Staff dashboard

Staff should see:

- new orders;
- active orders;
- staff calls;
- bookings for today;
- table numbers;
- order statuses.

### 7.2 Order statuses

Recommended statuses:

- new;
- accepted;
- preparing;
- ready;
- delivered;
- cancelled.

Hookah-specific optional statuses:

- mixing;
- heating;
- served;
- coals requested;
- coals replaced.

### 7.3 Filters

Staff dashboard should support filters:

- all;
- hookah;
- food/drinks;
- service calls;
- active;
- completed.

### 7.4 Notifications

MVP can start without push notifications.

First version:

- auto-refresh dashboard;
- visual badge for new orders;
- sound notification optional.

Later:

- Telegram bot notifications;
- web push;
- staff mobile app.

## 8. Admin experience

### 8.1 Menu management

Admin can:

- create categories;
- create items;
- edit items;
- change prices;
- hide items;
- mark items unavailable;
- reorder categories/items.

### 8.2 Tables and QR codes

Admin can:

- create table records;
- set table name/number;
- generate QR link;
- print QR code later.

MVP can generate simple URLs. QR image generation can be added later.

### 8.3 Booking management

Admin can:

- see bookings;
- approve/reject bookings;
- change status;
- add internal notes.

### 8.4 Staff management

Admin can:

- create staff users;
- assign roles;
- mark who is on shift today.

This can be simple at first.

## 9. Table Session Model (Future Architecture)

A physical table is permanent, but many different companies can use the same table during one day. Therefore, submitted orders and staff calls must not belong only to the table itself (`tableId`). They must belong to an active table session / visit.

### 9.1 Physical table
- A real table in the venue.
- Has a stable table ID and stable QR code.
- Example: `/t/1`.
- The QR code stays the same across days and visits.

### 9.2 Table session / visit
- A time-bounded visit by one guest or one group of guests at a table.
- One physical table can have many sessions during one day.
- Example:
  - Table 1, session A: guests from 18:00 to 20:00.
  - Table 1, session B: different guests from 20:30 to 23:00.
- Orders, order statuses, staff calls, and active table state should belong to the table session, not directly to the table.
- A session can be active, closed, cancelled, or expired.

### 9.3 Individual guest session
- Several people at the same table may scan the same QR code from different phones.
- Each guest/browser can have a personal draft cart before submitting.
- Draft carts should not accidentally overwrite each other.
- After submission, the order becomes part of the shared table session and can be visible to staff and, later, to other guests at the table.

### 9.4 Shared vs personal data
**Shared table-session data:**
- submitted orders
- order statuses
- staff calls
- table comments
- active visit state

**Personal guest data:**
- draft cart before submission
- guest profile
- favorite hookah preferences
- loyalty points
- personal notes
- previous visits

### 9.5 Staff dashboard implications
- Staff should see orders grouped by active table session.
- Staff should be able to distinguish current guests from previous guests at the same table.
- Closing a table session should prevent new orders from being added to the old visit.
- New guests at the same physical table should create/use a new active session.

### 9.6 Future backend implications
When real backend is implemented, the core model should look like:
- Table
- TableSession
- GuestSession / User
- Order
- OrderItem
- StaffCall

Relationships:
- Table has many TableSessions.
- TableSession has many Orders.
- TableSession has many StaffCalls.
- Order has many OrderItems.
- GuestSession/User can create draft carts and submit orders into the active TableSession.

### 9.7 MVP behavior
For the current mock MVP, this does not need to be implemented yet. But future real order sync must use table sessions, not just table IDs.
*(See `BACKEND_PLAN.md` for the full backend plan for the first real order sync).*

## 10. Data model draft

This is a conceptual draft, not the final schema.

### users

- id
- role
- display_name
- phone
- telegram_id
- vk_id
- created_at
- updated_at

### guest_profiles

- id
- user_id
- favorite_strength
- favorite_tastes
- disliked_tastes
- favorite_hookah_note
- birthday
- loyalty_points
- created_at
- updated_at

### tables

- id
- name
- number
- capacity
- zone
- qr_slug
- is_active
- created_at
- updated_at

### menu_categories

- id
- name
- description
- sort_order
- is_active

### menu_items

- id
- category_id
- name
- description
- price
- image_url
- tags
- is_available
- sort_order
- created_at
- updated_at

### orders

- id
- table_id
- guest_user_id
- status
- comment
- total_amount
- created_at
- updated_at

### order_items

- id
- order_id
- menu_item_id
- quantity
- price_snapshot
- comment

### hookah_orders

- id
- order_id
- strength
- taste_profile
- avoid_notes
- tobacco_preference
- bowl_preference
- guest_comment
- status

### staff_calls

- id
- table_id
- guest_user_id
- type
- status
- comment
- created_at
- handled_at

### bookings

- id
- guest_user_id
- table_id
- date
- start_time
- guests_count
- status
- guest_name
- contact
- comment
- occasion
- created_at
- updated_at

### loyalty_events

- id
- guest_user_id
- points_delta
- reason
- related_order_id
- created_at

### music_requests

- id
- guest_user_id
- table_id
- track_title
- artist
- status
- points_spent
- created_at
- reviewed_at

## 11. MVP milestones

### Milestone 0: Planning

- Finalize MVP scope.
- Choose tech stack.
- Define schema.
- Define screens.
- Define development tasks.

### Milestone 1: Project scaffold

- Create app structure.
- Add basic UI layout.
- Add placeholder guest/staff/admin pages.
- Add local development instructions.

### Milestone 2: Menu

- Menu categories.
- Menu item list.
- Item details.
- Admin seed data or simple management.
- Availability flag.

### Milestone 3: Table orders

- Table QR route.
- Cart.
- Submit order.
- Staff dashboard receives orders.
- Status updates.

### Milestone 4: Hookah preferences

- Hookah order form.
- Strength/taste/avoid/comment fields.
- Hookah dashboard filter.
- Save favorite preference draft.

### Milestone 5: Staff calls

- Call waiter.
- Replace coals.
- Ask for bill.
- Staff dashboard queue.

### Milestone 6: Basic admin

- Menu management.
- Tables.
- Staff roles, if needed.

### Milestone 7: Guest profile

- Basic auth or guest session.
- Favorite hookah note.
- Repeat previous preference.

### Milestone 8: Booking

- Simple booking form.
- Booking admin list.
- Optional table/zone selection.

### Milestone 9: Loyalty and music

- Points.
- Music requests queue.
- Simple moderation.

## 12. Parallelization plan

Safe parallel tasks after scaffold:

- Guest UI layout
- Staff dashboard UI
- Menu data model
- Admin menu management
- Product documentation
- Design system / components

Tasks that should not run in parallel without coordination:

- database schema changes;
- auth/session architecture;
- order model and status model;
- routing structure;
- major UI redesign;
- migration system.

## 13. Risks

### Scope creep

The product has many attractive features. The MVP must stay focused.

### Operational complexity

A real venue needs reliable staff workflows. A half-working order system is worse than a PDF menu.

### Payment and legal complexity

Payments, fiscal receipts, and POS integration should be postponed.

### Music rights and moderation

Music requests should not directly control playback in early versions.

### Staff adoption

The system must be faster than existing workflow. Staff UI must be extremely simple.

### Guest friction

Guests should be able to browse and order without mandatory registration. Auth should be optional until profile/loyalty features.

## 14. What not to build first

Do not build these in the first implementation:

- native iOS/Android app;
- real payments;
- POS integration;
- AI recommendations;
- complex loyalty economy;
- direct Spotify/Apple Music/Yandex Music playback;
- complex map editor;
- multi-location SaaS;
- heavy analytics;
- complicated CRM.

## 15. First version success criteria

The first useful version is successful if:

- a guest can scan a table QR code;
- the app opens fast on mobile;
- the guest can browse a structured menu;
- the guest can submit an order from a table;
- staff can see the order in a dashboard;
- staff can update order status;
- the guest can request staff help;
- a hookah order can include preferences;
- the system is easier to update than PDF files.

## 16. Open questions

- Should the first version be built as a regular web app, PWA, or Telegram Mini App?
- Should guests be anonymous until they want a profile?
- Does the venue need real-time notifications immediately?
- Should booking require staff confirmation?
- Should the menu have photos in MVP?
- How many tables/zones does the venue have?
- Does the venue need integration with existing POS systems later?
- Who will manage menu updates?
- Should this be only for Harlem first or designed as reusable SaaS later?
