# Keyosk - Project Status

**Date:** 2026-11-06  
**Phase:** Implementation complete; automated QA green; manual browser checks pending  
**Feature code:** Implemented (uncommitted)  
**Repository:** `C:\Went\Projects\Keyosk`  
**Git baseline:** `6f4c5f1` plus uncommitted implementation changes

---

## 1. Confirmed scope

Keyosk is a simple responsive web ordering system inspired by a kiosk workflow, not a full kiosk platform.

Customer flow:

1. Browse available products.
2. Add products to a cart.
3. Check out.
4. Choose cash or mock online payment.
5. Receive an order number and printable receipt.

The receipt number is the same as the order number. Online payment is a mock only. An admin can log in, manage products, view orders, mark cash orders paid, and update order status.

Out of scope: kiosk devices/pairing, multi-store, customer accounts, variants/modifiers, categories/search/promos, inventory counts, refunds, tax, real payment gateways, webhooks, reports, and audit logs.

---

## 2. Stack

- Backend: Laravel 13, PHP 8.5, PostgreSQL 18, Sanctum, PHPUnit, Pint.
- Frontend: React 19, Vite 8, Tailwind CSS 4, Axios, React Router 7, Vitest, Testing Library.
- Database: `keyosk`; test database: `keyosk_test`.
- API: `/api/v1`.
- Local URLs: API `http://localhost:8000`, frontend `http://localhost:5173`.

---

## 3. Completed

### Backend

- Migrations for `users.is_admin`, `products`, `orders`, and `order_items`, with PostgreSQL `CHECK` constraints, indexes, foreign keys, and a generated `order_number`.
- Eloquent models, relationships, casts, and factories (`UserFactory::admin()`, `ProductFactory`, `OrderFactory`).
- `OrderCreationService`: transaction, authoritative server-side pricing, availability checks, snapshots, mock payment reference.
- Form Requests, API Resources, public/admin controllers.
- Sanctum admin authentication with 24-hour token expiry, `EnsureUserIsAdmin` middleware, and admin route guard.
- Rate limiters for login, order creation, and receipt lookup; generic JSON `404` and `429` handling.
- CORS configuration and `config/keyosk.php` currency setting.
- Idempotent seeder for one admin (from environment values) and seven demo products, one unavailable.
- 36 backend feature tests / 202 assertions pass on `keyosk_test`; Pint passes.

### Frontend

- API client with bearer-token interceptor, centralized endpoints, and normalized API errors.
- Cart reducer/context/provider with localStorage persistence and quantity clamping.
- Auth context/provider with session restore and admin route guard.
- Reusable UI primitives, domain components, store layout, and admin layout.
- Customer pages: storefront, cart, checkout, receipt, not found.
- Admin pages: login, product list, product create/edit, order list, order detail.
- Receipt page is printable (`window.print()` plus print CSS); order and receipt numbers match.
- 32 frontend tests across 6 files pass; ESLint and production build pass.

### Integration

- Scripted HTTP pass against the running API verified products, cash order, mock online order, receipt lookup, admin login/`me`, order list/detail, mark-paid, status update, admin product list, and logout.
- QA details and remaining manual checks are in `docs/QA_REPORT.md`.

---

## 4. Quality gate results

| Gate | Command | Result |
| --- | --- | --- |
| Backend tests | `php artisan test` | 36 passed, 202 assertions |
| Backend formatting | `vendor/bin/pint --test` | Passed |
| Frontend tests | `npm run test` | 32 passed (6 files) |
| Frontend lint | `npm run lint` | Passed |
| Frontend build | `npm run build` | Passed (120 modules) |

---

## 5. Local demo access

- Admin email: `admin@keyosk.test`
- Admin password: `password` (local demo value, supplied through `ADMIN_PASSWORD` when seeding; not committed)
- Storefront: `http://localhost:5173`
- API: `http://127.0.0.1:8000/api/v1`

The development database contains the seeded catalogue and two QA orders (`ORD-000001`, `ORD-000002`) created by the integration pass.

---

## 6. Remaining work

1. Manual browser checks: responsive widths, keyboard navigation, print preview, and CORS from the configured frontend origin.
2. Optional: run a migration `down()`/`up()` cycle on a disposable database.
3. Review the uncommitted diff and obtain approval before committing or pushing.
4. Production hardening: least-privilege PostgreSQL role, HTTPS, and environment-specific secrets.

---

## 7. Baseline issues resolved

| Issue | Resolution |
| --- | --- |
| No domain schema or API | Migrations, models, and `/api/v1` routes implemented and tested |
| Frontend ESLint failed | ESLint now passes |
| Vitest absent | Vitest, Testing Library, test setup, and 32 tests added |
| Sanctum token expiry `null` | Set to 1440 minutes (24 hours) by default |
| No explicit CORS config | Added `config/cors.php` using `FRONTEND_URL` |
| `intl` PHP extension missing | Still missing; does not affect runtime or tests |
| PostgreSQL superuser | Still used locally; must change before deployment |
