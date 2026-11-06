# Keyosk — API Documentation

**Status:** Implemented and verified against the Laravel `/api/v1` routes  
**Last updated:** 2026-11-06  
**Stack:** Laravel 13, PostgreSQL, Laravel Sanctum  
**Base URL (local):** `http://localhost:8000/api/v1`  
**Base URL (production):** `https://<api-host>/api/v1`

---

## 1. Scope

This contract covers the simplified 1–2 day assessment build:

- Public customer browsing, checkout, mock payment, and receipt lookup.
- Admin login/logout/current user with Sanctum bearer tokens.
- Admin product CRUD and availability toggling.
- Admin order list/detail, mark cash order paid, and update order status.

Explicitly **out of scope** for this API: kiosk devices/pairing, stores, customer accounts, categories, search, variants/modifiers, promos, inventory counts, refunds, tax, real payment gateways, webhooks, reports, and audit logs.

---

## 2. Conventions

### 2.1 Requests and responses

- All requests and responses use `application/json`.
- Clients should send `Accept: application/json` so validation failures return JSON instead of redirects.
- Request and response keys use `snake_case`.
- Successful single-resource responses are wrapped in `data`:

```json
{ "data": { "id": 1 } }
```

- Successful collection responses are wrapped in `data`:

```json
{ "data": [ { "id": 1 } ] }
```

- A collection may include optional `meta` (for example the configured currency). Pagination is optional for the MVP; see §2.6.
- `204 No Content` responses have an empty body.

### 2.2 Money

- All money is an **integer in minor units** (cents): `price_cents: 850` means `8.50`.
- Floating-point money is prohibited in requests, responses, and storage.
- Field names always end in `_cents`.
- The server computes all order money. Client-supplied prices, line totals, or order totals are ignored and never trusted.
- A single currency is configured on the backend and echoed as an ISO 4217 code such as `"USD"`.

### 2.3 Timestamps and identifiers

- Timestamps are ISO 8601 UTC, for example `2026-11-06T14:03:22Z`. Fractional seconds may be included.
- Nullable timestamps are returned as `null`.
- Internal database IDs are integers and are not secrets.
- `order_number` is a human-readable, unique, server-generated string. Clients must treat it as opaque.
- `receipt_token` is a 64-character lowercase hex receipt token. It is separate from `order_number` and must not be sequential.

### 2.4 Authentication header

Admin requests use a Sanctum bearer token:

```http
Authorization: Bearer 1|9f3c...
```

Tokens are sent only in the `Authorization` header, never in a URL or query string.

### 2.5 Error envelope

Validation and business-rule errors return:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "items.0.quantity": ["The quantity must be between 1 and 99."]
  }
}
```

`errors` is present for `422` responses and may be omitted for other error statuses. HTTP status codes are the primary machine-readable signal; no custom error-code catalog is required for the MVP.

### 2.6 Pagination and filtering

Pagination and advanced filtering are **optional** for the 1–2 day build.

- Base contract: admin collections return newest-first arrays.
- Optional additive extensions: `?page=`, `?per_page=`, `?status=`, `?payment_status=`.
- If pagination is added, keep the `data` array and add `meta` / `links` without breaking existing clients.

---

## 3. Authentication (admin)

All `/auth/*` routes except login, and all `/admin/*` routes, require `auth:sanctum` plus an admin middleware (or equivalent server-side `is_admin = true` check).

### 3.1 POST `/auth/login`

Public. Rate-limited.

Request:

```json
{
  "email": "admin@keyosk.test",
  "password": "password",
  "device_name": "admin-chrome"
}
```

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `email` | string | yes | valid email, max 255 |
| `password` | string | yes | max 255 |
| `device_name` | string | no | max 100; defaults to `admin-panel` |

`200` response:

```json
{
  "data": {
    "token": "1|9f3c...",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "name": "Ada Admin",
      "email": "admin@keyosk.test",
      "is_admin": true
    }
  }
}
```

Behavior:

- Valid credentials for an admin: issue a Sanctum personal access token.
- Invalid credentials: `422` with an `email` error.
- Valid credentials for a non-admin user: `403`, and **no token is issued**.
- The plaintext token is returned once. The client must store it securely.

### 3.2 GET `/auth/me`

Admin. Returns the authenticated admin:

```json
{
  "data": {
    "id": 1,
    "name": "Ada Admin",
    "email": "admin@keyosk.test",
    "is_admin": true
  }
}
```

### 3.3 POST `/auth/logout`

Admin. Revokes only the current access token.

`204 No Content` with an empty body.

### 3.4 Admin authorization rules

| Situation | Status |
| --- | --- |
| Missing, malformed, or expired token | `401` |
| Valid token but `is_admin = false` | `403` |
| Valid admin token | Allowed |

Password hashes, tokens, and other secrets are never returned by any endpoint.

---

## 4. Public customer endpoints

No customer authentication or account is required.

### 4.1 GET `/products`

Returns only products where `is_available = true`, ordered alphabetically by name.

`200` response:

```json
{
  "data": [
    {
      "id": 10,
      "name": "Classic Burger",
      "description": "Beef patty, cheese, lettuce, tomato",
      "price_cents": 850,
      "image_url": "https://example.com/images/burger.jpg",
      "is_available": true
    },
    {
      "id": 11,
      "name": "Fries",
      "description": null,
      "price_cents": 350,
      "image_url": null,
      "is_available": true
    }
  ],
  "meta": {
    "currency": "USD"
  }
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer | Product ID used at checkout |
| `name` | string | Product name |
| `description` | string \| null | Optional |
| `price_cents` | integer | Non-negative minor units |
| `image_url` | string \| null | Optional absolute URL; no upload endpoint |
| `is_available` | boolean | Always `true` in this response |

Unavailable products are hidden from customers. There is no public product-detail endpoint in the MVP.

### 4.2 POST `/orders`

Public. Creates an order and returns the order number, receipt token, and receipt data. Rate-limited.

Request:

```json
{
  "items": [
    { "product_id": 10, "quantity": 2 },
    { "product_id": 11, "quantity": 1 }
  ],
  "payment_method": "cash"
}
```

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `items` | array | yes | at least 1 item |
| `items.*.product_id` | integer | yes | must exist; must not repeat within the request |
| `items.*.quantity` | integer | yes | between 1 and 99 |
| `payment_method` | string | yes | `cash` or `online` |

Validation rules and errors:

- Duplicate `product_id` values are rejected with `422` (`items.*.product_id`).
- A missing product returns `422` (`items.*.product_id`).
- An unavailable product returns `422` (`items.*.product_id`) with a clear message.
- An empty `items` array returns `422`.
- Any client-supplied `price_cents`, `unit_price_cents`, `line_total_cents`, `total_cents`, or `currency` is ignored. The server reads current prices from the database.
- There is no customer name, email, note, or account field in the MVP.

`201` response:

```json
{
  "data": {
    "order_number": "ORD-000123",
    "receipt_token": "8f3c1a7e9b2d4f6a8c0e2b4d6f8a0c2e8f3c1a7e9b2d4f6a8c0e2b4d6f8a0c2e",
    "status": "pending",
    "payment_method": "cash",
    "payment_status": "unpaid",
    "payment_reference": null,
    "currency": "USD",
    "total_cents": 2050,
    "paid_at": null,
    "created_at": "2026-11-06T14:03:22Z",
    "items": [
      {
        "product_name": "Classic Burger",
        "unit_price_cents": 850,
        "quantity": 2,
        "line_total_cents": 1700
      },
      {
        "product_name": "Fries",
        "unit_price_cents": 350,
        "quantity": 1,
        "line_total_cents": 350
      }
    ]
  }
}
```

#### 4.2.1 Order creation behavior (authoritative)

The server performs these steps inside a **database transaction**:

1. Validate the payload.
2. Load the requested products from the database.
3. Verify every product exists and is currently available.
4. Snapshot `product_name` and the current `price_cents` on each order item.
5. Compute `line_total_cents = unit_price_cents × quantity` and `total_cents = Σ line_total_cents`.
6. Persist the order so PostgreSQL generates the unique human-readable `order_number`, and generate a unique 64-character hex `receipt_token`.
7. Persist the order and its items.
8. Set payment fields based on `payment_method`:

| `payment_method` | `payment_status` | `payment_reference` | `paid_at` |
| --- | --- | --- | --- |
| `cash` | `unpaid` | `null` | `null` |
| `online` | `paid` | mock reference such as `MOCK-01J...` | current UTC time |

9. Commit and return `201`.

Additional rules:

- There is no tax, discount, delivery fee, tip, or promotion. `total_cents` is the sum of line totals.
- The order number **is** the receipt number. No separate receipt number is generated.
- `order_number` is unique and human-readable (example: `ORD-000123`) but is not a secret and must not be used to authorize receipt access.
- `receipt_token` must be exactly 64 lowercase hex characters, generated with `bin2hex(random_bytes(32))`, and unique. Do not derive it from an ID, timestamp, or order number.
- Mock online payments always succeed immediately. No external gateway or webhook is called.
- Cash orders remain `unpaid` until an admin marks them paid.
- New orders start with `status: "pending"`.
- No idempotency key is required in the MVP. A retried request creates a new order; the frontend should disable the submit button while a request is in flight.

### 4.3 GET `/receipts/{receipt_token}`

Public receipt lookup by unguessable token. This is the only public way to read an existing order.

`200` response:

```json
{
  "data": {
    "order_number": "ORD-000123",
    "status": "pending",
    "payment_method": "cash",
    "payment_status": "unpaid",
    "payment_reference": null,
    "currency": "USD",
    "total_cents": 2050,
    "paid_at": null,
    "created_at": "2026-11-06T14:03:22Z",
    "items": [
      {
        "product_name": "Classic Burger",
        "unit_price_cents": 850,
        "quantity": 2,
        "line_total_cents": 1700
      },
      {
        "product_name": "Fries",
        "unit_price_cents": 350,
        "quantity": 1,
        "line_total_cents": 350
      }
    ]
  }
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `order_number` | string | Also the receipt number |
| `status` | string | `pending`, `completed`, or `cancelled` |
| `payment_method` | string | `cash` or `online` |
| `payment_status` | string | `unpaid` or `paid` |
| `payment_reference` | string \| null | Mock reference for online payments |
| `currency` | string | ISO 4217 code |
| `total_cents` | integer | Server-computed total |
| `paid_at` | timestamp \| null | Payment time |
| `created_at` | timestamp | Order placement time |
| `items[].product_name` | string | Price/name snapshot at checkout |
| `items[].unit_price_cents` | integer | Snapshot unit price |
| `items[].quantity` | integer | 1–99 |
| `items[].line_total_cents` | integer | `unit_price_cents × quantity` |

Behavior and security:

- An unknown, malformed, or deleted token returns `404` with the same generic response to avoid token probing.
- Never look up a public receipt by `id` or `order_number`.
- The receipt payload contains no customer personal data and no internal item IDs.
- The frontend receipt page can be printed with the browser. The API returns JSON only; PDF generation is out of scope.
- The receipt may be reopened while the order exists. Token expiry/revocation is an open question.

---

## 5. Admin endpoints

All endpoints in this section require:

- `Authorization: Bearer <admin token>`
- `auth:sanctum`
- Admin middleware (`is_admin = true`)

### 5.1 Products

#### GET `/admin/products`

Returns all products, including unavailable products, newest first.

```json
{
  "data": [
    {
      "id": 10,
      "name": "Classic Burger",
      "description": "Beef patty, cheese, lettuce, tomato",
      "price_cents": 850,
      "image_url": "https://example.com/images/burger.jpg",
      "is_available": true,
      "created_at": "2026-11-06T10:00:00Z",
      "updated_at": "2026-11-06T10:00:00Z"
    }
  ],
  "meta": {
    "currency": "USD"
  }
}
```

#### POST `/admin/products`

Request:

```json
{
  "name": "Classic Burger",
  "description": "Beef patty, cheese, lettuce, tomato",
  "price_cents": 850,
  "image_url": "https://example.com/images/burger.jpg",
  "is_available": true
}
```

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | string | yes | max 140 |
| `description` | string \| null | no | max 2000 |
| `price_cents` | integer | yes | min 0 |
| `image_url` | string \| null | no | valid URL, max 2048 |
| `is_available` | boolean | no | defaults to `true` |

`201` returns the created product in the admin product shape.

#### GET `/admin/products/{product}`

`200` returns one product in the admin product shape. Missing product returns `404`.

#### PATCH `/admin/products/{product}`

Partial update. Send only the fields to change:

```json
{
  "price_cents": 900,
  "is_available": false
}
```

All fields are optional but, when present, use the same rules as creation. `200` returns the updated product.

**Availability toggle:** send `PATCH /admin/products/{product}` with `{ "is_available": false }` or `{ "is_available": true }`. The next public `GET /products` reflects the change. No separate toggle endpoint is required.

#### DELETE `/admin/products/{product}`

Deletes the product. `204 No Content`.

- Historical order items are not modified or deleted. They keep the snapshotted `product_name`, `unit_price_cents`, `quantity`, and `line_total_cents`.
- `order_items.product_id` must be nullable or set to `null` when the product is deleted (for example `nullOnDelete`).
- Hard delete is implemented for the MVP; soft delete is not used.

### 5.2 Orders

#### GET `/admin/orders`

Returns order summaries, newest first.

```json
{
  "data": [
    {
      "id": 123,
      "order_number": "ORD-000123",
      "status": "pending",
      "payment_method": "cash",
      "payment_status": "unpaid",
      "currency": "USD",
      "total_cents": 2050,
      "items_count": 2,
      "created_at": "2026-11-06T14:03:22Z",
      "paid_at": null
    }
  ]
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer | Internal order ID |
| `order_number` | string | Human-readable order/receipt number |
| `status` | string | `pending`, `completed`, or `cancelled` |
| `payment_method` | string | `cash` or `online` |
| `payment_status` | string | `unpaid` or `paid` |
| `currency` | string | ISO 4217 code |
| `total_cents` | integer | Server-computed total |
| `items_count` | integer | Number of order lines |
| `created_at` | timestamp | Placement time |
| `paid_at` | timestamp \| null | Payment time |

Optional additive filters for later: `?status=`, `?payment_status=`, `?payment_method=`, `?order_number=`. Pagination is optional and not required for the MVP.

#### GET `/admin/orders/{order}`

Returns full order detail.

```json
{
  "data": {
    "id": 123,
    "order_number": "ORD-000123",
    "receipt_token": "8f3c1a7e9b2d4f6a8c0e2b4d6f8a0c2e8f3c1a7e9b2d4f6a8c0e2b4d6f8a0c2e",
    "status": "pending",
    "payment_method": "cash",
    "payment_status": "unpaid",
    "payment_reference": null,
    "currency": "USD",
    "total_cents": 2050,
    "paid_at": null,
    "created_at": "2026-11-06T14:03:22Z",
    "updated_at": "2026-11-06T14:03:22Z",
    "items": [
      {
        "id": 501,
        "product_id": 10,
        "product_name": "Classic Burger",
        "unit_price_cents": 850,
        "quantity": 2,
        "line_total_cents": 1700
      }
    ]
  }
}
```

Admin detail adds internal identifiers and `receipt_token` so the admin can open the receipt. Missing order returns `404`.

### 5.3 POST `/admin/orders/{order}/mark-paid`

Marks an unpaid **cash** order as paid. No request body is required.

`200` returns the full admin order detail with:

- `payment_status: "paid"`
- `paid_at` set to the current UTC time
- `payment_reference` remains `null` for cash

Rules, evaluated in this order:

| Condition | Result |
| --- | --- |
| Order not found | `404` |
| `payment_method = online` | `422`, even if already paid |
| Order status is `cancelled` | `422` |
| `payment_method = cash` and `payment_status = paid` | `200` no-op (idempotent) |
| `payment_method = cash`, `payment_status = unpaid`, status `pending` or `completed` | Mark paid |

This endpoint is for cash collection only. It never changes the mock online payment state.

### 5.4 PATCH `/admin/orders/{order}/status`

Updates the order status.

Request:

```json
{ "status": "completed" }
```

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `status` | string | yes | `pending`, `completed`, or `cancelled` |

`200` returns the full admin order detail.

Behavior:

- Setting the current status again is a `200` no-op.
- Payment status is independent. Cancelling an order does **not** refund or change `payment_status`.
- The MVP accepts any of the three status values. Restricting terminal transitions is deferred to a future version.
- Updating `status` does not change the order number, total, items, or receipt token.

---

## 6. Error responses and status codes

| HTTP | Meaning | Example body |
| --- | --- | --- |
| `200` | OK | `{ "data": { ... } }` |
| `201` | Created | `{ "data": { ... } }` |
| `204` | No content | Empty body |
| `400` | Malformed JSON | `{ "message": "Malformed JSON." }` |
| `401` | Missing/invalid/expired token | `{ "message": "Unauthenticated." }` |
| `403` | Authenticated but not an admin, or action forbidden | `{ "message": "This action is unauthorized." }` |
| `404` | Resource or receipt token not found | `{ "message": "Not found." }` |
| `422` | Validation or business-rule failure | `{ "message": "...", "errors": { ... } }` |
| `429` | Rate limit exceeded | `{ "message": "Too many attempts. Please try again later." }` |
| `500` | Unexpected server error | `{ "message": "Server error." }` |

Common `422` cases:

- Invalid login credentials.
- Missing/empty `items`.
- Quantity outside `1..99`.
- Duplicate product lines.
- Product does not exist.
- Product is unavailable.
- Invalid `payment_method`.
- Invalid `status`.
- Attempting to mark an online order as cash-paid.

Example unavailable-product error:

```json
{
  "message": "One or more products are unavailable.",
  "errors": {
    "items.0.product_id": ["This product is unavailable."]
  }
}
```

Example login error:

```json
{
  "message": "The provided credentials are incorrect.",
  "errors": {
    "email": ["The provided credentials are incorrect."]
  }
}
```

`429` responses should include a `Retry-After` header.

---

## 7. Security notes

### 7.1 Admin access

- Admin routes require both Sanctum authentication and an admin-only middleware (`is_admin` check).
- Non-admin tokens receive `403`; missing/invalid tokens receive `401`.
- Logout revokes only the current token.
- Never return password hashes or token values other than the one-time login token.
- Use HTTPS in production and keep secrets in environment variables.
- Do not log authorization headers, tokens, or passwords.

### 7.2 Public order and receipt access

- No customer login or account is required.
- Receipt access uses only the random `receipt_token`.
- Public routes must never expose `GET /orders/{id}` or lookup by `order_number`.
- An invalid token returns `404`, not `403`, to avoid confirming whether an order exists.
- The order number is human-readable and may be printed, but it is not an authorization secret.
- Receipt responses contain no customer personal data and no internal item IDs.

### 7.3 Checkout integrity

- Validate every request server-side with Form Requests.
- Re-read product price and availability inside the checkout transaction; never trust the cart.
- Snapshot product name and unit price on order items.
- Use a database transaction for order and item creation.
- Enforce unique `order_number` and unique `receipt_token` at the database level.
- Use Eloquent/query bindings; do not build raw SQL from request input.

### 7.4 Rate limiting

| Scope | Suggested limit |
| --- | --- |
| `POST /auth/login` | 5 per minute per IP + email |
| `POST /orders` | 20 per minute per IP |
| `GET /receipts/{receipt_token}` | 60 per minute per IP (recommended) |
| Admin writes | 120 per minute per token (optional) |

Return `429` with `Retry-After` when a limit is exceeded.

### 7.5 CORS

- Allow only the configured frontend origin (`FRONTEND_URL`).
- Allow the methods and headers used by this contract, including `Authorization` and `Content-Type`.
- Bearer tokens are used, so cookie credentials are not required.
- Do not use a wildcard origin in production.

### 7.6 Payments

- Online payment is a mock only.
- Never collect, transmit, or store card numbers, CVVs, or real payment credentials.
- Mock online orders are marked paid server-side at creation.
- Cash orders are marked paid only by an admin.
- No refunds, chargebacks, or real gateway webhooks exist in this scope.

---

## 8. Assumptions

The rules in Sections 2–7 are the implemented API contract. The items in this section were approved on 2026-11-06 and describe the delivered behavior.

1. The MVP uses one backend-configured currency, defaulting to USD; no conversion or multi-currency.
2. Product names and non-negative prices are required; description and image URL are optional.
3. Product images are external URLs only; there is no file-upload endpoint.
4. The admin account is seeded or created by a developer. There is no admin-registration API.
5. `order_number` follows an opaque human-readable format such as `ORD-000123`; clients must not parse it.
6. The order number and receipt number are the same value; no separate receipt number field exists.
7. Cash orders are created `unpaid` and become `paid` only through the admin mark-paid endpoint.
8. Mock online payments always succeed immediately.
9. Marking an already-paid cash order paid is an idempotent `200` no-op.
10. A cancelled cash order cannot be marked paid.
11. Public product listing hides unavailable products rather than showing them disabled.
12. Product deletion is a hard delete; order items keep their snapshots and `product_id` becomes `null`.
13. Receipt tokens are 64 lowercase hex characters and remain valid while the order exists.
14. No customer name, email, note, or order history is collected.
15. No pagination, search, or filters are required for the MVP; collections are newest-first arrays.
16. Any of `pending`, `completed`, and `cancelled` may be set through the status endpoint; terminal-state enforcement is not yet specified.
17. There is no idempotency key for order creation; duplicate submissions create separate orders.
18. Receipts are printable HTML pages rendered by the frontend, not PDFs.
19. Sanctum admin tokens expire after 24 hours by default, configurable through the environment.
20. There are no taxes, discounts, fees, tips, promos, inventory counts, refunds, or real payments.

---

## 9. Open API questions (resolved)

These questions were resolved by the approved decisions in `docs/IMPLEMENTATION_PLAN.md` section 9. The list is retained as a record of the clarification questions.

1. What currency and locale should responses/UI use, and where should they be configured?
2. Is the `ORD-000123` order-number format and length acceptable?
3. Should `completed` and `cancelled` be terminal statuses, or may an admin reopen an order?
4. Should a cancelled cash order ever be markable as paid, or is cancellation final?
5. Should public product listing hide unavailable products or return them with `is_available: false`?
6. Should product deletion be a hard delete or a soft delete/deactivation?
7. Should receipt tokens expire or be revocable, or remain valid indefinitely?
8. Should the admin be able to create additional admin users through the API/UI, or is a seeded admin enough?
9. Should checkout collect a customer name or order note?
10. Should mock online payment simulate failure/cancellation, or always succeed?
11. Are order pagination and filters required for the assessment demo?
12. Is a printable HTML receipt sufficient, or is a PDF download required?
13. Should order creation support an `Idempotency-Key` to prevent duplicate orders?

---

## 10. Endpoint summary

```
Public
  GET    /products
  POST   /orders
  GET    /receipts/{receipt_token}

Auth (admin unless noted)
  POST   /auth/login                 public
  POST   /auth/logout                admin
  GET    /auth/me                    admin

Admin products
  GET    /admin/products
  POST   /admin/products
  GET    /admin/products/{product}
  PATCH  /admin/products/{product}
  DELETE /admin/products/{product}

Admin orders
  GET    /admin/orders
  GET    /admin/orders/{order}
  POST   /admin/orders/{order}/mark-paid
  PATCH  /admin/orders/{order}/status
```
