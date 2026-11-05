# Keyosk — API Documentation

**Status:** Draft v1.0
**Last updated:** 2026-11-05
**Base URL:** `https://api.keyosk.example/api/v1`
**Content type:** `application/json` (except webhooks, still JSON)
**OpenAPI:** generated from this document into `docs/openapi.yaml` during Phase 1.

---

## 1. Conventions

### 1.1 Requests

- JSON bodies use `snake_case` keys.
- Timestamps are ISO 8601 UTC with `Z` (e.g. `2026-11-05T14:03:22Z`). Store-local business dates are `YYYY-MM-DD`.
- Money is an integer in minor units (`total_cents: 1250` = $12.50). Currency is ISO 4217.
- IDs are integers. Public-facing identifiers (order numbers) are strings.
- Unknown body fields are rejected with `422` to catch client drift.

### 1.2 Responses

Single resource:

```json
{ "data": { "id": 1, "name": "Kiosk 1" } }
```

Collection:

```json
{
  "data": [ { "id": 1 } ],
  "meta": { "current_page": 1, "per_page": 25, "total": 42, "last_page": 2 },
  "links": { "next": "...", "prev": null }
}
```

No-content responses return `204` with an empty body.

### 1.3 Errors

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The given data was invalid.",
    "details": { "items.0.quantity": ["The quantity must be between 1 and 99."] }
  },
  "meta": { "request_id": "01JCH2..." }
}
```

| HTTP | Code examples |
| --- | --- |
| 400 | `BAD_REQUEST`, `MALFORMED_JSON` |
| 401 | `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `KIOSK_DISABLED` |
| 403 | `FORBIDDEN`, `STORE_SCOPE_DENIED`, `REFUND_APPROVAL_REQUIRED` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT`, `IDEMPOTENCY_KEY_REUSED`, `INVALID_STATE_TRANSITION`, `PROMO_REDEMPTION_LIMIT` |
| 422 | `VALIDATION_FAILED`, `TOTAL_MISMATCH`, `PRODUCT_UNAVAILABLE`, `PROMO_INVALID` |
| 429 | `RATE_LIMITED` (includes `Retry-After`) |
| 500 | `SERVER_ERROR` |
| 503 | `MAINTENANCE` |

Every response includes `X-Request-Id`; error bodies repeat it in `meta.request_id`.

### 1.4 Pagination, filtering, sorting

- Query: `page` (default 1), `per_page` (default 25, max 100).
- Filters are explicit per endpoint (e.g. `?status=paid&store_id=2&from=2026-11-01&to=2026-11-05`).
- Sorting: `?sort=-created_at` (prefix `-` for descending). Allow-listed columns only.
- Invalid filters return `422`.

### 1.5 Idempotency

`POST` endpoints that create money-affecting resources accept `Idempotency-Key: <uuid>`.

- Same key + same payload within 24 h ⇒ replay the original response (`200`/`201`) with `Idempotency-Replayed: true`.
- Same key + different payload ⇒ `409 IDEMPOTENCY_KEY_REUSED`.
- Applies to: create order, submit order, create payment, refund.

### 1.6 Rate limits

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

| Scope | Limit |
| --- | --- |
| `POST /auth/login` | 5 / minute / IP + email |
| `POST /kiosk/pair` | 10 / minute / IP |
| `POST /kiosk/orders` | 30 / minute / kiosk |
| `POST /kiosk/orders/{id}/promo` | 20 / minute / kiosk |
| `POST` payments | 30 / minute / kiosk |
| Admin writes | 120 / minute / user |
| Reads | 300 / minute / token |

---

## 2. Authentication

### 2.1 Staff (admin panel)

Sanctum personal access tokens. Login returns a bearer token; clients send `Authorization: Bearer <token>`.
Token abilities are derived from role (`admin`, `manager`, `cashier`, `kitchen`) and store scope.

**POST `/auth/login`**

```json
{ "email": "manager@keyosk.test", "password": "secret", "device_name": "office-chrome" }
```

`200`:

```json
{
  "data": {
    "token": "1|9f3c...",
    "token_type": "Bearer",
    "expires_at": "2026-11-06T14:00:00Z",
    "user": {
      "id": 7,
      "name": "Mia Manager",
      "email": "manager@keyosk.test",
      "role": "manager",
      "stores": [ { "id": 2, "name": "Downtown" } ]
    }
  }
}
```

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/login` | public | Obtain token |
| POST | `/auth/logout` | staff | Revoke current token |
| GET | `/auth/me` | staff | Current user + role + store scope |
| POST | `/auth/password` | staff | Change own password |
| POST | `/auth/mfa/verify` | staff | Complete MFA challenge when enabled |

### 2.2 Kiosk devices

A kiosk is registered by an admin, who receives a one-time pairing code. The device exchanges the code for a long-lived token with the `kiosk` ability.

**POST `/kiosk/pair`**

```json
{ "pairing_code": "7Q4K-2M9X", "serial_number": "KIOSK-A1B2", "app_version": "1.0.0" }
```

`200`:

```json
{
  "data": {
    "token": "12|k8s...",
    "kiosk": { "id": 3, "name": "Kiosk 1", "store": { "id": 2, "name": "Downtown", "currency": "USD" } }
  }
}
```

Pairing codes are single-use and expire after 30 minutes. Re-pairing with the same serial rotates the token and revokes the previous one.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/kiosk/pair` | public + pairing code | Exchange code for device token |
| POST | `/kiosk/heartbeat` | kiosk | Report `app_version`, returns server time + enabled flags |
| GET | `/kiosk/config` | kiosk | Remote config (idle timeout, payment methods, branding) |

**POST `/kiosk/heartbeat`** → `200`

```json
{
  "data": {
    "server_time": "2026-11-05T14:03:22Z",
    "kiosk": { "id": 3, "status": "active" },
    "payment_methods": ["card", "cash"],
    "idle_timeout_seconds": 120,
    "menu_version": "2026-11-05T13:50:00Z"
  }
}
```

`401 KIOSK_DISABLED` is returned when the kiosk or its store is disabled; the app must lock ordering.

---

## 3. Kiosk API

All kiosk endpoints are scoped to the authenticated kiosk's store. Attempting to access another store's resource returns `404` (not `403`) to avoid enumeration.

### 3.1 Menu

**GET `/kiosk/menu`**

Returns the active menu. Cached for 60 s via `ETag`; send `If-None-Match` to get `304`.

`200` (trimmed):

```json
{
  "data": {
    "store": {
      "id": 2,
      "name": "Keyosk Downtown",
      "currency": "USD",
      "locale": "en",
      "tax_inclusive": false,
      "tax_rate_bps": 825
    },
    "menu_version": "2026-11-05T13:50:00Z",
    "categories": [
      {
        "id": 11,
        "name": "Coffee",
        "image_url": "https://cdn.keyosk.example/cat/coffee.jpg",
        "products": [
          {
            "id": 101,
            "name": "Flat White",
            "description": "Double ristretto, steamed milk",
            "base_price_cents": 450,
            "image_url": "https://cdn.keyosk.example/p/flat-white.jpg",
            "is_available": true,
            "dietary_tags": ["vegetarian"],
            "allergens": ["milk"],
            "variants": [
              { "id": 1001, "name": "Small", "price_delta_cents": 0, "is_default": true },
              { "id": 1002, "name": "Large", "price_delta_cents": 80, "is_default": false }
            ],
            "modifier_groups": [
              {
                "id": 21,
                "name": "Milk",
                "min_select": 1,
                "max_select": 1,
                "is_required": true,
                "modifiers": [
                  { "id": 201, "name": "Whole", "price_delta_cents": 0, "is_default": true },
                  { "id": 202, "name": "Oat", "price_delta_cents": 75, "is_default": false }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

Unavailable products are included with `is_available: false` so the app can show them disabled. Products that are `is_active: false` or in inactive categories are omitted.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/kiosk/menu` | Full active menu for the kiosk's store |
| GET | `/kiosk/products/{id}` | Single product detail (same shape as above) |

### 3.2 Orders

**POST `/kiosk/orders`** — create a draft

Headers: `Idempotency-Key: <uuid>`

```json
{
  "items": [
    {
      "product_id": 101,
      "variant_id": 1002,
      "quantity": 2,
      "modifiers": [
        { "modifier_id": 202, "quantity": 1 }
      ],
      "note": "Extra hot"
    }
  ],
  "customer_name": "Sam",
  "note": "No straws"
}
```

`201`:

```json
{
  "data": {
    "id": 8841,
    "order_number": "A-0042",
    "status": "draft",
    "currency": "USD",
    "subtotal_cents": 1210,
    "discount_cents": 0,
    "tax_cents": 100,
    "total_cents": 1310,
    "expires_at": "2026-11-05T14:18:22Z",
    "items": [
      {
        "id": 30121,
        "product_id": 101,
        "product_name": "Flat White",
        "variant_name": "Large",
        "quantity": 2,
        "unit_price_cents": 605,
        "line_subtotal_cents": 1210,
        "line_tax_cents": 100,
        "line_total_cents": 1310,
        "modifiers": [
          {
            "modifier_group_name": "Milk",
            "modifier_name": "Oat",
            "unit_price_delta_cents": 75,
            "quantity": 1,
            "line_total_cents": 75
          }
        ]
      }
    ]
  }
}
```

Errors: `422 PRODUCT_UNAVAILABLE`, `422 VALIDATION_FAILED` (modifier min/max), `422 TOTAL_MISMATCH` if a `client_total_cents` preview is supplied and differs.

**POST `/kiosk/orders/{id}/promo`**

```json
{ "code": "WELCOME10" }
```

`200` returns the recomputed order. `422 PROMO_INVALID` with `details.reason` (`expired`, `min_subtotal`, `limit_reached`, `not_found`).

**DELETE `/kiosk/orders/{id}/promo`** — remove discount, recompute.

**POST `/kiosk/orders/{id}/submit`**

```json
{ "payment_method": "card" }
```

`200` — order moves to `pending_payment` and, for card, a payment intent is created:

```json
{
  "data": {
    "order": { "id": 8841, "order_number": "A-0042", "status": "pending_payment", "total_cents": 1310 },
    "payment": {
      "id": 5510,
      "method": "card",
      "status": "requires_payment_method",
      "amount_cents": 1310,
      "currency": "USD",
      "client_secret": "pi_3N..._secret_..."
    }
  }
}
```

For `payment_method: "cash"`, no `client_secret` is returned; the order waits for staff to take payment.

**GET `/kiosk/orders/{id}`** — poll status; used to reconcile after payment or a network drop.

**POST `/kiosk/orders/{id}/cancel`** — allowed from `draft`/`pending_payment` only.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/kiosk/orders` | Create draft order |
| GET | `/kiosk/orders/{id}` | Order status + totals |
| POST | `/kiosk/orders/{id}/promo` | Apply promo code |
| DELETE | `/kiosk/orders/{id}/promo` | Remove promo code |
| POST | `/kiosk/orders/{id}/submit` | Submit and start payment |
| POST | `/kiosk/orders/{id}/cancel` | Abandon unpaid order |
| GET | `/kiosk/orders/{id}/receipt` | Receipt payload (JSON) |

### 3.3 Payments

**POST `/kiosk/orders/{id}/payments`** — retry or switch method on a `pending_payment` order.

Headers: `Idempotency-Key: <uuid>`

```json
{ "method": "card" }
```

`201`:

```json
{
  "data": {
    "id": 5511,
    "status": "requires_payment_method",
    "amount_cents": 1310,
    "currency": "USD",
    "provider": "stripe",
    "client_secret": "pi_3N..._secret_..."
  }
}
```

The kiosk confirms with the provider SDK. **The kiosk must then poll `GET /kiosk/orders/{id}`; it must not mark the order paid itself.**

**POST `/kiosk/orders/{id}/payments/{payment_id}/sync`** — force a server-side reconciliation with the provider. Used after a timeout. Returns the payment and order status.

### 3.4 Order states observed by the kiosk

| Kiosk sees | Meaning | UI |
| --- | --- | --- |
| `draft` | Cart persisted server-side | Cart |
| `pending_payment` | Awaiting card/cash | Payment / "please pay at counter" |
| `paid` | Confirmed paid | Success + order number |
| `cancelled` | Abandoned/expired | Return to attract screen |
| `refunded` | Refunded by staff | "See staff" |

---

## 4. Admin API

All endpoints require a staff token. `manager`/`cashier`/`kitchen` are limited to their assigned stores; `admin` is global. Kitchen may only read orders and advance fulfilment states.

### 4.1 Stores

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/stores` | admin | List stores |
| POST | `/stores` | admin | Create store |
| GET | `/stores/{id}` | admin, manager | Store detail |
| PATCH | `/stores/{id}` | admin | Update store/config |
| DELETE | `/stores/{id}` | admin | Soft-delete (blocked if orders exist) |

**POST `/stores`**

```json
{
  "name": "Keyosk Downtown",
  "slug": "downtown",
  "timezone": "America/New_York",
  "currency": "USD",
  "locale": "en",
  "tax_inclusive": false,
  "idle_timeout_seconds": 120,
  "address_line1": "1 Main St",
  "city": "Springfield",
  "region": "IL",
  "postal_code": "62701",
  "country": "US",
  "phone": "+1-555-0100",
  "email": "downtown@keyosk.example"
}
```

### 4.2 Users

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/users` | admin, manager | List staff (managers see own stores) |
| POST | `/users` | admin | Create staff user |
| PATCH | `/users/{id}` | admin | Update profile/role/stores |
| POST | `/users/{id}/deactivate` | admin | Disable login |
| POST | `/users/{id}/password-reset` | admin | Send reset link |

`POST /users` body: `name`, `email`, `password`, `role`, `store_ids[]`.
Role changes and store reassignment are written to the audit log.

### 4.3 Kiosks

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/kiosks` | admin, manager | List with online status |
| POST | `/kiosks` | admin | Register kiosk |
| GET | `/kiosks/{id}` | admin, manager | Detail + last heartbeat |
| PATCH | `/kiosks/{id}` | admin | Rename, reassign store, settings |
| POST | `/kiosks/{id}/pairing-code` | admin | Generate one-time pairing code (returns plaintext once) |
| POST | `/kiosks/{id}/disable` | admin | Disable and revoke tokens |
| DELETE | `/kiosks/{id}` | admin | Soft-delete |

**POST `/kiosks/{id}/pairing-code`** → `201`

```json
{ "data": { "pairing_code": "7Q4K-2M9X", "expires_at": "2026-11-05T14:33:22Z" } }
```

`GET /kiosks` item:

```json
{
  "id": 3,
  "name": "Kiosk 1",
  "store_id": 2,
  "status": "active",
  "online": true,
  "last_seen_at": "2026-11-05T14:03:10Z",
  "app_version": "1.0.0"
}
```

### 4.4 Catalog

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/categories` | admin, manager | List (filter `store_id`) |
| POST | `/categories` | admin, manager | Create |
| PATCH | `/categories/{id}` | admin, manager | Update |
| DELETE | `/categories/{id}` | admin, manager | Soft-delete |
| GET | `/products` | admin, manager, cashier | List/search/filter |
| POST | `/products` | admin, manager | Create |
| GET | `/products/{id}` | admin, manager | Detail with variants/groups |
| PATCH | `/products/{id}` | admin, manager | Update |
| DELETE | `/products/{id}` | admin, manager | Soft-delete |
| POST | `/products/{id}/variants` | admin, manager | Add variant |
| PATCH | `/products/{id}/variants/{variant}` | admin, manager | Update variant |
| DELETE | `/products/{id}/variants/{variant}` | admin, manager | Remove variant |
| PUT | `/products/{id}/modifier-groups` | admin, manager | Sync attached groups |
| GET | `/modifier-groups` | admin, manager | List groups + modifiers |
| POST | `/modifier-groups` | admin, manager | Create group |
| PATCH | `/modifier-groups/{id}` | admin, manager | Update group |
| DELETE | `/modifier-groups/{id}` | admin, manager | Soft-delete |
| POST | `/modifier-groups/{id}/modifiers` | admin, manager | Add modifier |
| PATCH | `/modifier-groups/{id}/modifiers/{modifier}` | admin, manager | Update modifier |
| DELETE | `/modifier-groups/{id}/modifiers/{modifier}` | admin, manager | Remove modifier |
| GET | `/tax-rates` | admin, manager | List |
| POST | `/tax-rates` | admin | Create |
| PATCH | `/tax-rates/{id}` | admin | Update |

**POST `/products`**

```json
{
  "store_id": 2,
  "category_id": 11,
  "tax_rate_id": 4,
  "name": "Flat White",
  "slug": "flat-white",
  "sku": "COF-FW",
  "description": "Double ristretto, steamed milk",
  "base_price_cents": 450,
  "image_path": "products/flat-white.jpg",
  "dietary_tags": ["vegetarian"],
  "allergens": ["milk"],
  "is_active": true,
  "is_available": true,
  "sort_order": 10
}
```

Image upload uses `POST /media` (multipart, field `file`) returning `{ "data": { "path": "products/..." } }`; the product then references the path.

**Product availability toggle** — `PATCH /products/{id}` with `{ "is_available": false }`. Effective within 60 s on kiosks.

### 4.5 Promo codes

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/promo-codes` | admin, manager | List |
| POST | `/promo-codes` | admin, manager | Create |
| PATCH | `/promo-codes/{id}` | admin, manager | Update |
| DELETE | `/promo-codes/{id}` | admin, manager | Soft-delete |

```json
{
  "store_id": 2,
  "code": "WELCOME10",
  "description": "10% off first order",
  "type": "percentage",
  "value": 1000,
  "min_subtotal_cents": 0,
  "starts_at": "2026-11-01T00:00:00Z",
  "ends_at": "2026-12-01T00:00:00Z",
  "max_redemptions": 500,
  "is_active": true
}
```

### 4.6 Orders and fulfilment

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/orders` | admin, manager, cashier, kitchen | List/filter (`store_id`, `status`, `from`, `to`, `q`) |
| GET | `/orders/{id}` | same | Detail with items, payments, history |
| POST | `/orders/{id}/transition` | admin, manager, kitchen | Move fulfilment state |
| POST | `/orders/{id}/cancel` | admin, manager | Cancel with reason |
| POST | `/orders/{id}/payments/cash` | admin, manager, cashier | Record cash payment |
| POST | `/orders/{id}/refunds` | manager, admin | Refund (full/partial) |
| GET | `/orders/{id}/receipt` | any staff | Receipt JSON / printable HTML |

**POST `/orders/{id}/transition`**

```json
{ "to_status": "preparing", "reason": null }
```

Allowed by role:

| Transition | Roles |
| --- | --- |
| `paid → preparing` | kitchen, manager, admin |
| `preparing → ready` | kitchen, manager, admin |
| `ready → completed` | cashier, manager, admin |
| any → `cancelled` | manager, admin (paid requires refund decision) |

Invalid transitions return `409 INVALID_STATE_TRANSITION`.

**POST `/orders/{id}/payments/cash`**

```json
{ "amount_cents": 1310, "tendered_cents": 2000 }
```

Returns payment `succeeded`, order `paid`, and `change_cents: 690`.

**POST `/orders/{id}/refunds`**

Headers: `Idempotency-Key: <uuid>`

```json
{ "amount_cents": 500, "reason": "Customer dissatisfied" }
```

`201`:

```json
{
  "data": {
    "id": 77,
    "payment_id": 5510,
    "amount_cents": 500,
    "status": "succeeded",
    "provider_refund_id": "re_3N...",
    "approved_by": { "id": 2, "name": "Ada Admin" }
  }
}
```

Refunds above the configured threshold without an approver return `403 REFUND_APPROVAL_REQUIRED` and `details.threshold_cents`.

### 4.7 Reports and dashboard

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | `/reports/dashboard` | admin, manager | Live status counts + today's totals |
| GET | `/reports/sales` | admin, manager | Daily sales summary |
| GET | `/reports/products` | admin, manager | Product sales ranking |
| GET | `/reports/payments` | admin, manager | Totals by method/provider |
| GET | `/reports/exports/sales.csv` | admin, manager | CSV export (streamed) |
| GET | `/audit-logs` | admin | Filter by actor/action/entity/date |

**GET `/reports/sales?store_id=2&from=2026-11-01&to=2026-11-05&group_by=day`**

```json
{
  "data": [
    {
      "date": "2026-11-05",
      "orders": 128,
      "gross_cents": 184300,
      "discount_cents": 9200,
      "tax_cents": 14450,
      "net_cents": 189550,
      "refunded_cents": 1250,
      "by_method": { "card": 172000, "cash": 12300 }
    }
  ],
  "meta": { "store_id": 2, "currency": "USD", "timezone": "America/New_York" }
}
```

### 4.8 Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | public | `{ "status": "ok", "db": true, "queue": true, "time": "..." }` |
| GET | `/up` | public | Laravel liveness probe (plain 200) |

---

## 5. Webhooks

### 5.1 Outbound (Keyosk → integrations)

Configured per store. Signed with `X-Keyosk-Signature: t=<unix>,v1=<hmac_sha256(t + "." + body)>`.
Retries: 5 attempts with exponential backoff (10 s, 1 m, 5 m, 30 m, 2 h), then dead-letter.

Events:

| Event | Payload |
| --- | --- |
| `order.paid` | order snapshot + payment |
| `order.completed` | order snapshot |
| `order.refunded` | order + refund |
| `kiosk.offline` | kiosk id, last_seen_at |

### 5.2 Inbound (payment provider → Keyosk)

**POST `/webhooks/stripe`** — no bearer auth; verified via provider signature header.

Handled events:

| Provider event | Effect |
| --- | --- |
| `payment_intent.succeeded` | payment → `succeeded`; order → `paid`; audit + outbound event |
| `payment_intent.payment_failed` | payment → `failed`; order stays `pending_payment` |
| `charge.refunded` | payment refunded totals; order → `refunded` when fully refunded |
| `charge.dispute.created` | alert + audit log entry |

Webhook handling is idempotent by provider event ID (stored in `payments`/`audit_logs`). It must return `2xx` quickly and process side effects in a queued job.

---

## 6. Endpoint summary

```
Public
  POST   /auth/login
  POST   /kiosk/pair
  POST   /webhooks/stripe
  GET    /health
  GET    /up

Kiosk (Bearer, ability: kiosk)
  GET    /kiosk/menu
  GET    /kiosk/products/{id}
  GET    /kiosk/config
  POST   /kiosk/heartbeat
  POST   /kiosk/orders
  GET    /kiosk/orders/{id}
  POST   /kiosk/orders/{id}/promo
  DELETE /kiosk/orders/{id}/promo
  POST   /kiosk/orders/{id}/submit
  POST   /kiosk/orders/{id}/cancel
  POST   /kiosk/orders/{id}/payments
  POST   /kiosk/orders/{id}/payments/{payment}/sync
  GET    /kiosk/orders/{id}/receipt

Staff (Bearer)
  GET    /auth/me
  POST   /auth/logout
  POST   /auth/password
  GET    /stores ...
  GET    /users ...
  GET    /kiosks ...
  GET    /categories ...
  GET    /products ...
  GET    /modifier-groups ...
  GET    /tax-rates ...
  GET    /promo-codes ...
  GET    /orders ...
  GET    /reports/...
  GET    /audit-logs ...
```

---

## 7. Versioning and deprecation

- All routes are under `/api/v1`. Breaking changes ship as `/api/v2`; additive fields do not bump the version.
- Deprecated fields/endpoints carry `Deprecation` and `Sunset` response headers and are documented here for at least 90 days.
- Clients must ignore unknown response fields.

## 8. Change log

| Date | Version | Change |
| --- | --- | --- |
| 2026-11-05 | 1.0-draft | Initial specification |
