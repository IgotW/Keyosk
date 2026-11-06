# Keyosk - Implementation Plan

**Status:** Approved and implemented; automated gates pass (see `docs/QA_REPORT.md`)  
**Last updated:** 2026-11-06  
**Delivery target:** 1-2 day assessment build  
**Code status:** Implemented; changes uncommitted pending review.

---

## 1. Confirmed scope

Build a simple responsive website inspired by a kiosk ordering workflow:

- Customer browses available products.
- Customer adds products to a cart, updates quantities, and removes items.
- Customer checks out with **cash** or **mock online payment**.
- The API creates the order, calculates all totals server-side, and generates an order number.
- The **order number is also the receipt number**.
- The customer receives a printable receipt through an unguessable token.
- Admin logs in, manages products, views orders, marks cash orders paid, and updates order status.

Explicitly excluded: kiosk hardware/pairing, multi-store, customer accounts, variants/modifiers, categories/search/promos, inventory counts, refunds, tax, real payment gateways, webhooks, reports, and audit logs.

---

## 2. Stack

### Backend

| Concern | Choice |
| --- | --- |
| Framework | Laravel 13 |
| Language | PHP 8.5 |
| Database | PostgreSQL 18 |
| Auth | Laravel Sanctum bearer tokens |
| Tests | PHPUnit 12 |
| Code style | Laravel Pint |

### Frontend

| Concern | Choice |
| --- | --- |
| Framework | React 19 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| HTTP | Axios |
| Tests | Vitest + Testing Library (to be added) |
| Lint | ESLint 9 |

### Local URLs

- API: `http://localhost:8000/api/v1`
- Frontend: `http://localhost:5173`
- PostgreSQL: `127.0.0.1:5432`
- App database: `keyosk`
- Test database: `keyosk_test`

---

## 3. Architecture

```
React + Vite frontend
        |
        |  JSON over HTTP, Sanctum bearer token for admin
        v
Laravel REST API
        |
        |  Eloquent
        v
PostgreSQL
```

Rules:

- React never connects to PostgreSQL.
- All prices and totals are calculated by Laravel.
- The frontend sends product IDs and quantities only.
- Admin routes are protected by Sanctum plus an admin middleware.
- Public receipt access uses a 64-character hex token, never the order ID or order number.

---

## 4. Backend plan

### 4.1 Migrations

1. Add `is_admin` boolean to `users`.
2. Create `products`.
3. Create `orders`.
4. Create `order_items`.

The `orders.order_number` column is a PostgreSQL stored generated column derived from `orders.id`:

```text
ORD-000001
ORD-000002
```

This is concurrency-safe and unique. Gaps are acceptable.

The `orders.receipt_token` column stores a unique 64-character lowercase hex token generated with `bin2hex(random_bytes(32))`.

Historical order items preserve:

- `product_name`
- `unit_price_cents`
- `quantity`
- `line_total_cents`

Product deletion uses `order_items.product_id ON DELETE SET NULL`; snapshot columns remain unchanged.

### 4.2 Models and relationships

- `Product` - name, description, price, image URL, availability.
- `Order` - order number, receipt token, status, payment method/status/reference, total, paid timestamp, items.
- `OrderItem` - order, nullable product reference, snapshots, quantity, line total.
- `User` - add `HasApiTokens`, `is_admin` cast/fillable.

### 4.3 Authentication and authorization

- Add Sanctum support to the `User` model.
- Add `EnsureUserIsAdmin` middleware and register an `admin` alias.
- Admin login returns a bearer token and the user payload.
- Admin logout revokes only the current token.
- Admin routes require `auth:sanctum` plus `admin`.
- Set Sanctum token expiration to 24 hours by default, configurable through environment.
- Seed an admin user from environment values. If no password is provided, generate one and print it once during seeding.

### 4.4 API endpoints

Public:

- `GET /api/v1/products`
- `POST /api/v1/orders`
- `GET /api/v1/receipts/{receipt_token}`

Admin:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/admin/products`
- `POST /api/v1/admin/products`
- `GET /api/v1/admin/products/{product}`
- `PATCH /api/v1/admin/products/{product}`
- `DELETE /api/v1/admin/products/{product}`
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/orders/{order}`
- `POST /api/v1/admin/orders/{order}/mark-paid`
- `PATCH /api/v1/admin/orders/{order}/status`

Detailed request/response shapes are in `docs/API_DOCUMENTATION.md`.

### 4.5 Order creation service

One service performs order creation inside a database transaction:

1. Validate at least one item, distinct product IDs, quantity `1..99`, and a valid payment method.
2. Load requested products from PostgreSQL.
3. Reject missing or unavailable products.
4. Use current database prices; ignore client prices/totals.
5. Calculate line totals and order total.
6. Insert the order.
7. Insert immutable order-item snapshots.
8. Refresh the order to read the generated order number.
9. Return the order with its receipt token.

Payment behavior:

| Method | Payment status | Reference | Paid at |
| --- | --- | --- | --- |
| `cash` | `unpaid` | `null` | `null` |
| `online` | `paid` | `MOCK-...` | current time |

Cash orders become paid only through the admin mark-paid endpoint. Mock online orders are always paid immediately. No external service is called.

### 4.6 Backend configuration

- Add `config/keyosk.php` for the display currency (default assumed `USD`).
- Add explicit `config/cors.php` allowing the configured frontend origin.
- Add login, order-creation, and receipt rate limits.
- Keep secrets in `.env`; add required keys to `.env.example` without real secrets.

### 4.7 Backend tests

Use PostgreSQL `keyosk_test` with `RefreshDatabase`.

Critical coverage:

- Public product listing returns only available products.
- Order creation rejects empty, duplicate, invalid-quantity, missing, and unavailable products.
- Server ignores client prices/totals and snapshots current product data.
- Cash order is `unpaid`; mock online order is `paid` with a mock reference.
- Order number is generated and equals the receipt number.
- Receipt lookup works only by token; unknown token returns `404`.
- Product edits/deletes do not change historical order items.
- Admin login, logout, and admin middleware.
- Non-admin users receive `403`; unauthenticated requests receive `401`.
- Admin product CRUD.
- Admin order list/detail, mark-paid rules, and status updates.
- No order is created when validation fails.

---

## 5. Frontend plan

### 5.1 Routes

| Route | Page | Access |
| --- | --- | --- |
| `/` | Storefront product listing | Public |
| `/cart` | Cart | Public |
| `/checkout` | Checkout | Public; empty cart redirects |
| `/receipt/:token` | Printable receipt | Public |
| `/admin/login` | Admin login | Public |
| `/admin/products` | Product management | Admin |
| `/admin/products/new` | Create product | Admin |
| `/admin/products/:id/edit` | Edit product | Admin |
| `/admin/orders` | Order list | Admin |
| `/admin/orders/:id` | Order detail | Admin |
| `*` | Not found | Public |

### 5.2 State and API integration

- `CartContext` with `useReducer`.
- Persist cart in `localStorage` under a versioned key.
- Reconcile cart against the latest product list before checkout; block unavailable or deleted products.
- Clear the cart only after a successful order creation.
- Central Axios client with `baseURL` from `VITE_API_URL`.
- Auth token in `sessionStorage` or `localStorage`.
- `AuthContext` restores the token and calls `GET /auth/me`.
- `RequireAdmin` guard redirects unauthenticated users to `/admin/login`.
- Normalize API errors into a single frontend error shape.
- Never send client totals to the API.

### 5.3 UI structure

Reusable components:

- Button, Input, Textarea, FieldError, Card, Badge, Spinner.
- LoadingState, ErrorState, EmptyState, ConfirmDialog.
- Price, QuantityStepper, CartLine, OrderSummary.
- PaymentMethodSelector, ProductCard.
- ProductForm, OrderTable, OrderDetail, StatusBadge.

Customer pages:

- Storefront product grid.
- Cart with quantity controls and totals.
- Checkout with payment method selection.
- Receipt with print button and payment/status summary.

Admin pages:

- Login.
- Product list with availability toggle, edit, and delete.
- Product create/edit form.
- Order list.
- Order detail with mark-cash-paid and status controls.

### 5.4 Receipt

- Fetch by receipt token.
- Display order number as both order number and receipt number.
- Show items, quantities, line totals, total, payment method, payment status, and timestamp.
- Cash: "Payment due at counter."
- Online: "Paid (mock)."
- Use browser print CSS and `window.print()`. No PDF library.

### 5.5 Frontend tests and quality gates

- Add Vitest, Testing Library, `jest-dom`, and `jsdom`.
- Add a `test` script.
- Test cart reducer, quantity rules, totals, money formatting, persistence parsing, and API error normalization.
- Fix the current ESLint configuration for JSX.
- Run `npm run lint`, `npm run test`, and `npm run build`.

---

## 6. Delivery schedule

### Day 1 - Backend foundation

| Order | Task | Done when |
| --- | --- | --- |
| 1 | Fix backend config baseline and environment keys | `.env.example` includes API/frontend/currency/admin keys |
| 2 | Create migrations and models | Migrations run on `keyosk_test`; rollback works |
| 3 | Add factories and seed admin/demo products | Seeder is idempotent; admin can be created |
| 4 | Implement Sanctum admin auth and middleware | Login/logout/me tests pass |
| 5 | Implement admin product CRUD | Product tests pass |
| 6 | Implement public product list and order creation | Order/total/snapshot tests pass |
| 7 | Implement receipt lookup | Token lookup and `404` tests pass |
| 8 | Implement admin order management | Mark-paid and status tests pass |
| 9 | Run full backend test suite | `php artisan test` passes |

### Day 2 - Frontend and integration

| Order | Task | Done when |
| --- | --- | --- |
| 1 | Fix ESLint and add Vitest tooling | `npm run lint` and `npm run test` pass |
| 2 | Build app shell, router, layouts, API client | Pages load without console errors |
| 3 | Build cart state and storefront | Customer can add/update/remove items |
| 4 | Build checkout and receipt | Cash/online orders reach printable receipt |
| 5 | Build admin login and guard | Protected routes redirect correctly |
| 6 | Build admin product page | CRUD and availability toggle work |
| 7 | Build admin order page | List/detail, mark paid, status update work |
| 8 | Integration pass | Customer and admin flows work against the API |
| 9 | Final quality gates | Backend tests, frontend tests, lint, and build pass |

---

## 7. What is mandatory vs optional

### Mandatory for approval

- Customer product listing, cart, checkout, cash/mock online payment.
- Server-side totals and snapshots.
- Order number = receipt number.
- Printable receipt by unguessable token.
- Admin login, product CRUD, order list/detail, mark cash paid, status update.
- Backend feature tests, frontend cart/money tests, lint, and build.

### Optional if time remains

- Product images via upload.
- Categories, search, and filters.
- Pagination.
- Admin user-management UI.
- Order notes/customer name.
- PDF/email receipts.
- Real payment provider, refunds, inventory, reports, multi-store, kiosk devices.

If time is short, cut optional items in that order. Do not cut the customer checkout, receipt, admin product page, or security checks.

---

## 8. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 1-2 day scope is tight | Incomplete admin polish | Prioritize customer flow, receipt, and product admin; defer optional features |
| No idempotency key | Double-click can create duplicate orders | Disable submit while pending; document accepted risk |
| Generated `order_number` column | Migration/model mismatch | Verify migration and refresh the model after insert |
| Hard-deleted products | Historical product link becomes null | Keep snapshots; test after deletion |
| Receipt token leakage | Unauthorized receipt access | 64-character random token, no lookup by ID/order number, no-store headers |
| Status transitions unrestricted | Admin can reopen orders | Accepted for MVP; document; enforce later |
| PostgreSQL superuser in local app | Excessive privileges | Note for production; create least-privilege role before deployment |
| `intl` extension missing | `db:show` fails | Not required by the planned tests; install before production/tooling use |
| Frontend baseline lint failure | Quality gate red | Fix ESLint before feature work |
| Currency/locale unspecified | Receipt formatting ambiguity | Use configurable `KEYOSK_CURRENCY`; default assumption USD |

---

## 9. Decisions requiring approval

Please confirm or correct these before implementation:

1. API prefix: `/api/v1` (assumed).
2. Currency: configurable backend setting, default `USD` (assumed).
3. Order number format: `ORD-000001`, global sequential, gaps allowed (assumed).
4. Receipt token: 64 lowercase hex characters, no expiry for MVP (assumed).
5. Product deletion: hard delete, order-item snapshots preserved (assumed).
6. Order statuses: `pending`, `completed`, `cancelled`; any value can be set in MVP (assumed).
7. Cash orders: created unpaid, admin marks paid (assumed).
8. Mock online payments: always succeed immediately (assumed).
9. No customer name, email, note, or order history (assumed).
10. No tax, discounts, delivery fees, promos, refunds, or inventory (confirmed out of scope).
11. Product images: optional external URL only, no upload (assumed).
12. Admin account: seeded from environment values; no admin-registration UI (assumed).
13. Sanctum token expiry: 24 hours (assumed).
14. Receipt: printable HTML, not PDF/email (assumed).

---

## 10. Approval and implementation outcome

The plan and all 14 decisions in section 9 were approved on 2026-11-06.

Implementation outcome:

- Day 1 backend tasks and Day 2 frontend tasks are complete.
- Backend: 36 tests / 202 assertions pass on `keyosk_test`; Pint passes.
- Frontend: 32 tests pass; `npm run lint` and `npm run build` pass.
- HTTP integration verified the customer cash/mock-online flows, receipt lookup, admin auth, order list/detail, mark-paid, status update, and logout.
- Remaining manual checks are browser responsive layout, keyboard navigation, print preview, and CORS origin rejection; see `docs/QA_REPORT.md`.
- Changes remain uncommitted pending review and approval.
