# Keyosk - QA Report

**Status:** Implemented; automated gates pass, browser-level manual checks pending  
**Last updated:** 2026-11-06  
**Release under test:** Local assessment build  
**Scope:** Simplified 1-2 day ordering-system assessment build

---

## 1. Summary

The customer and admin flows are implemented and exercised. All automated quality gates pass. An HTTP-level end-to-end pass verified the customer cash/online flows, receipt lookup, admin authentication, order listing/detail, mark-paid, status update, and logout against the running Laravel API.

| Area | Executed | Passed | Failed | Notes |
| --- | --- | --- | --- | --- |
| Backend feature tests | 36 tests / 202 assertions | 36 | 0 | PostgreSQL `keyosk_test`, `RefreshDatabase` |
| Backend formatting | 1 | 1 | 0 | `vendor/bin/pint --test` |
| Frontend unit/component tests | 32 tests / 6 files | 32 | 0 | Vitest + jsdom + Testing Library |
| Frontend lint | 1 | 1 | 0 | `npm run lint` |
| Frontend production build | 1 | 1 | 0 | 120 modules, built successfully |
| HTTP end-to-end flows | 1 scripted pass | 1 | 0 | Cash, online, receipt, admin order flows |

**Release recommendation:** Conditional pass. Automated and API-level checks pass. Remaining work is limited to manual browser verification of responsive layouts, keyboard navigation, and the print preview.

---

## 2. Automated results

### Backend

Command: `php artisan test` (from `backend/`)

```text
Tests:    36 passed (202 assertions)
Duration: ~5.7s
```

Coverage:

- Public listing filters unavailable products and returns `meta.currency`.
- Order creation ignores client-supplied prices and totals.
- Empty items, invalid quantities, unknown/unavailable products, duplicate products, and invalid payment methods are rejected without creating orders.
- A mixed cart containing an unavailable product creates neither an order nor partial order items (transaction rollback behavior).
- Cash orders are created `pending`/`unpaid`; mock online orders are created `paid` with a `MOCK-<ULID>` reference and `paid_at`.
- Product edit/delete preserves order-item snapshots (`product_id` becomes `null`).
- Receipt lookup works by token without auth; unknown tokens and order numbers return a generic `404`; receipt payload omits internal IDs and the token.
- Admin login, invalid credentials, non-admin rejection, `/me`, logout token revocation, guest `401`, non-admin `403`, and login rate limiting.
- Admin product CRUD, validation, availability toggle, and generic `404`.
- Admin order list/detail with item counts, mark cash paid, idempotent mark-paid, online/cancelled rejection, status updates, and invalid status rejection.

Command: `vendor/bin/pint --test` — passed.

### Frontend

Commands: `npm run test`, `npm run lint`, `npm run build` (from `frontend/`)

```text
Test Files  5 passed (5)
Tests       32 passed (32)
Lint        passed
Build       passed (120 modules)
```

Coverage:

- Money formatting, dollars-to-cents parsing, invalid input rejection, cents-to-dollars.
- Cart totals.
- Cart reducer add/merge/increment/cap/remove/clear/replace and unknown actions.
- Cart storage parsing, malformed data, duplicate removal, quantity clamping, persistence.
- API error normalization for validation errors, response messages, status fallbacks, timeouts, and network failures.
- Empty-cart checkout guard redirects to `/cart`.
- App smoke tests: storefront loads products from the API; unauthenticated `/admin/products` redirects to the admin login page.

---

## 3. HTTP end-to-end verification

Executed against `php artisan serve` on `http://127.0.0.1:8000` using the development `keyosk` database.

| Step | Result |
| --- | --- |
| `GET /api/v1/products` | 7 available products returned; `meta.currency = USD` |
| `POST /api/v1/orders` (cash, 2 products) | Created `ORD-000001`, `pending`, `unpaid`, total `2650` cents |
| `GET /api/v1/receipts/{token}` (no auth) | Returned the same order number and total; token/internal IDs omitted |
| `POST /api/v1/orders` (online) | Created `ORD-000002`, `paid` |
| `POST /api/v1/auth/login` | Admin token returned |
| `GET /api/v1/auth/me` | Admin identity returned |
| `GET /api/v1/admin/orders` | Both orders listed with item counts |
| `GET /api/v1/admin/orders/{id}` | Detail returned 2 items and `2650` cents |
| `POST /api/v1/admin/orders/{id}/mark-paid` | Cash order became `paid` with `paid_at` |
| `PATCH /api/v1/admin/orders/{id}/status` | Order became `completed` |
| `GET /api/v1/admin/products` | All 7 products returned, including unavailable |
| `POST /api/v1/auth/logout` | Token revoked; `204` |

Note: these checks intentionally created two QA orders in the development database. No existing records were edited or deleted outside the tested order lifecycle.

---

## 4. Mandatory test matrix

Status values: `Pass`, `Partial`, `Fail`, `Not run`.

| ID | Flow | Key assertions | Status | Evidence |
| --- | --- | --- | --- | --- |
| QA-01 | Public product listing | Only available products returned; fields correct; empty list; admin list includes unavailable products. | Pass | Backend tests + HTTP run |
| QA-02 | Cart logic | Add, merge, increment, decrement, remove, quantity `1..99`, totals, persistence, corrupted storage. | Pass | Reducer/storage/money tests + empty-cart checkout guard |
| QA-03 | Order validation | Empty items, invalid quantities, unknown/unavailable products, duplicates, invalid payment method; no side effects. | Pass | `OrderCreationTest` |
| QA-04 | Server totals and snapshots | Client totals ignored; DB price used; snapshots survive edit/delete; totals reconcile. | Pass | `OrderCreationTest` incl. rollback test |
| QA-05 | Cash order | Created `unpaid`; admin marks paid; online/cancelled rejected; duplicate mark-paid idempotent. | Pass | `AdminOrderTest` + HTTP run |
| QA-06 | Mock online order | Created `paid` with mock reference and `paid_at`; no gateway or card data. | Pass | `OrderCreationTest` + HTTP run |
| QA-07 | Receipt token | Token returned; public lookup; unknown token/order number `404`; unique 64-hex token; refreshable receipt. | Pass | `ReceiptTest` + HTTP run |
| QA-08 | Admin auth | Login, invalid credentials, `401`, `403`, `/me`, logout revocation. | Pass | `AdminAuthTest` + HTTP run |
| QA-09 | Admin product CRUD | Create, read, update, delete, availability, validation, `404`, snapshot preservation. | Pass | `AdminProductTest` |
| QA-10 | Admin order management | List/detail, mark cash paid, status updates, invalid status, `404`. | Pass | `AdminOrderTest` + HTTP run |
| QA-11 | Security and errors | JSON errors, CORS origins, rate limits, no secrets in frontend, mass-assignment protection, injection safety. | Partial | Rate limits, `401`/`403`/`404`, and hidden fields are automated/tested. CORS and injection attempts were not executed. |
| QA-12 | Quality gates and presentation | Backend/frontend tests, lint, build, migration up/down, responsive widths, print layout. | Partial | All automated gates pass; migration up ran on `keyosk_test`; browser responsive/print checks pending. |

---

## 5. Remaining manual checks

These are the only outstanding QA items and are code-reviewed but not browser-executed:

1. Responsive layout at 375 px, 768 px, and 1280 px.
2. Keyboard-only checkout and admin form navigation.
3. Print preview of the receipt (header/footer hidden, `.print-area` unboxed).
4. CORS from the configured frontend origin and rejection of other origins.
5. Migration `down()`/`up()` cycle on a disposable database.

---

## 6. Known limitations and accepted risks

| Item | Impact | Status |
| --- | --- | --- |
| No idempotency key on order creation | Double submission can create duplicate orders | Accepted for MVP; submit button disables while pending |
| Order statuses freely settable | Admin can reopen or cancel any order | Accepted for MVP |
| Product hard delete | Product link becomes `null`; snapshots retained | Tested |
| Receipt token has no expiry | Possession grants receipt access | Accepted for MVP; 64 hex characters |
| Local PostgreSQL superuser | Excessive local privileges | Local only; create a least-privilege role before deployment |
| `intl` PHP extension missing | `php artisan db:show` fails | Not required by tests or runtime |
| Frontend is API-only | No server-side rendering | Accepted |

---

## 7. Exit criteria

| Criterion | Status |
| --- | --- |
| Backend feature tests pass against `keyosk_test` | Pass |
| Frontend unit tests pass | Pass |
| `npm run lint` passes | Pass |
| `npm run build` passes | Pass |
| Manual customer cash and mock-online flows pass | Pass (HTTP-level) |
| Admin login, product management, mark-paid, and status flows pass | Pass (automated + HTTP-level) |
| Receipt lookup and print flow passes | Lookup pass; print preview pending browser check |
| No open P1 security or data-integrity defects | Pass (none found) |
