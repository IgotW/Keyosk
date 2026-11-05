# Keyosk — Requirements

**Status:** Draft v1.0
**Last updated:** 2026-11-05
**Owners:** Product, Engineering

---

## 1. Overview

Keyosk is a self-service ordering system for quick-service restaurants and retail counters. Customers place and pay for orders on a touch-screen kiosk; staff manage the menu, kiosks, and order queue from an admin panel.

The system has three surfaces:

| Surface | Audience | Technology |
| --- | --- | --- |
| Kiosk app | Customers | React + Vite (touch UI) |
| Admin panel | Staff, managers, admins | React + Vite (desktop UI) |
| API | Both surfaces, integrations | Laravel (REST, JSON) |

### 1.1 Goals

- Let a first-time customer complete an order unaided in under 90 seconds.
- Keep the kiosk responsive and usable on low-end hardware and unreliable networks.
- Give managers full control of menu, pricing, availability, and kiosk devices without a deploy.
- Produce an accurate, auditable record of every order, payment, and refund.
- Support multiple store locations and multiple kiosks per location from one deployment.

### 1.2 Non-goals (v1)

- Native mobile ordering app.
- Delivery or third-party marketplace integration.
- Loyalty points, gift cards, or customer accounts.
- Full inventory/stock counting (only per-item availability toggles).
- Kitchen display system (KDS) hardware integration — v1 exposes an order queue API/UI instead.
- Multi-tenant SaaS billing.

---

## 2. Personas

| Persona | Description | Primary needs |
| --- | --- | --- |
| Customer | Walk-up kiosk user | Fast browsing, clear pricing, reliable payment, receipt |
| Cashier | Counter staff | Look up orders, take cash payments, issue refunds with approval |
| Kitchen staff | Preparation staff | See paid orders and mark them preparing/ready |
| Manager | Store manager | Menu, pricing, promos, kiosk status, daily reports |
| Administrator | Central operations / IT | Stores, users, roles, integrations, audit |

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| Store | A physical location with its own menu, tax rate, and kiosks. |
| Kiosk | A registered device bound to one store. |
| Product | A sellable item, optionally with variants and modifier groups. |
| Variant | A size/flavor choice that changes price or SKU (e.g. Small/Large). |
| Modifier group | A set of options for a product (e.g. "Milk choice"), with min/max selection. |
| Modifier | A single option inside a group (e.g. "Oat milk", +$0.75). |
| Order | A customer purchase containing one or more items. |
| Payment | A single attempt/settlement against an order. |
| Minor units | Integer amount in the currency's smallest unit (cents, pence, yen). |

---

## 4. Functional requirements

Requirement IDs are stable; tests and tickets should reference them.

### 4.1 Kiosk app — browsing and cart

- **FR-K01** The kiosk shall boot directly into an attract/idle screen showing the store name and a "Start order" call to action.
- **FR-K02** The kiosk shall display the store's active menu grouped by category, with product name, image, and starting price.
- **FR-K03** The kiosk shall allow filtering by category and searching products by name (case- and accent-insensitive).
- **FR-K04** The kiosk shall show unavailable products as disabled with an "Unavailable" label; they cannot be added to the cart.
- **FR-K05** Product detail shall show description, allergen/dietary tags, variants, and modifier groups, and enforce each group's min/max selection before "Add to cart" is enabled.
- **FR-K06** The cart shall support increasing/decreasing quantity, removing lines, and editing a line's variants/modifiers.
- **FR-K07** The cart shall show line prices, subtotal, discount, tax, and total, updating within 100 ms of any change.
- **FR-K08** The kiosk shall persist the in-progress cart locally so a browser refresh does not lose it.
- **FR-K09** The kiosk shall reset to the attract screen after a configurable idle timeout (default 120 s), discarding an unpaid cart after a confirmation prompt.
- **FR-K10** The kiosk shall support a configurable currency, locale, and tax display (inclusive or exclusive pricing) per store.
- **FR-K11** The kiosk shall apply an optional promo code and show a clear reason when a code is invalid.
- **FR-K12** The UI shall meet WCAG 2.1 AA: minimum 44×44 CSS-pixel touch targets, 4.5:1 text contrast, visible focus, no color-only status cues, and screen-reader labels.

### 4.2 Kiosk app — checkout and payment

- **FR-P01** Checkout shall collect an optional customer name and order note, and require explicit confirmation of the total before payment.
- **FR-P02** Supported payment methods in v1: card (online payment intent) and pay-at-counter (order held unpaid). Methods are configurable per store.
- **FR-P03** Card payment shall never let the kiosk handle raw card data; the client uses a provider SDK/tokenization flow and the API only stores provider references.
- **FR-P04** Payment result shall be shown unambiguously: success (with order number), decline (with retry), or timeout (with retry/cancel guidance).
- **FR-P05** An order shall only be marked paid after server-side confirmation from the payment provider or a verified webhook — never on client assertion alone.
- **FR-P06** Payment creation shall be idempotent: retries with the same idempotency key must not double-charge.
- **FR-P07** On success the kiosk shall offer an emailed or printed receipt when configured, and always display the order number.
- **FR-P08** If the network drops mid-payment, the kiosk shall poll order status and reconcile before allowing a retry.
- **FR-P09** The kiosk shall lock out new orders while its device token is revoked or the kiosk is disabled, showing a "Please see staff" message.

### 4.3 Orders and fulfilment

- **FR-O01** The system shall assign a human-readable order number per store per business day (e.g. `A-0042`), unique and non-reused.
- **FR-O02** Order lifecycle: `draft → pending_payment → paid → preparing → ready → completed`, with `cancelled` and `refunded` as terminal/exceptional states. Transitions are validated server-side.
- **FR-O03** Every status transition shall be recorded with timestamp, actor (kiosk or user), and optional reason.
- **FR-O04** The admin panel shall show a live order queue filterable by store, status, and date, refreshing without a full page reload.
- **FR-O05** Staff shall be able to move an order forward (`paid → preparing → ready → completed`) and cancel an unpaid order.
- **FR-O06** Cancelling a paid order shall require a refund or an explicit "no refund" reason recorded in the audit log.
- **FR-O07** Prices, names, tax, and modifiers shall be snapshotted onto the order at creation so later menu edits cannot change historical totals.
- **FR-O08** The API shall compute all totals server-side; client-supplied totals are ignored and validated against recomputation.
- **FR-O09** An order shall expire from `draft`/`pending_payment` after a configurable TTL (default 15 min) and release its order number reservation.

### 4.4 Menu and catalog management

- **FR-M01** Admins shall CRUD stores, categories, products, variants, modifier groups, modifiers, and tax rates.
- **FR-M02** Products shall support: name, description, SKU, base price, image, category, tax rate, dietary/allergen tags, sort order, active flag, and availability flag.
- **FR-M03** Categories shall support sort order, active flag, and optional store scoping.
- **FR-M04** A modifier group shall define `min_select`, `max_select`, required flag, and may be attached to many products.
- **FR-M05** Menu changes shall be reflected on kiosks within 60 seconds without a kiosk restart.
- **FR-M06** The system shall support scheduled availability windows per product (e.g. breakfast 06:00–11:00) as an optional v1.1 feature — data model must not block it.
- **FR-M07** Deleting a product or modifier shall be soft-delete only; historical orders remain intact.
- **FR-M08** Images shall be validated (type, max 5 MB), stored on object storage, and served via CDN-able URLs.

### 4.5 Promotions and discounts

- **FR-D01** Admins shall create promo codes with: code, type (percentage or fixed amount), value, start/end datetime, minimum order subtotal, max redemptions, per-store scope, and active flag.
- **FR-D02** Promo codes shall be case-insensitive, unique, and validated atomically to prevent over-redemption under concurrency.
- **FR-D03** A promo discount shall never reduce an order total below zero; tax shall be recalculated on the discounted subtotal.
- **FR-D04** Each order shall store the applied code and discount amount as a snapshot.

### 4.6 Kiosk and device management

- **FR-KD01** Admins shall register a kiosk with a name and store, receiving a one-time pairing code.
- **FR-KD02** A kiosk shall exchange its pairing code for a device token; the token is stored hashed server-side and can be revoked.
- **FR-KD03** The admin panel shall show each kiosk's online/offline status based on the last heartbeat (offline after 90 s).
- **FR-KD04** Admins shall rename, reassign to another store, disable, and revoke tokens for a kiosk.
- **FR-KD05** Kiosks shall send a heartbeat every 30 s including app version.
- **FR-KD06** The API shall support remote config (idle timeout, payment methods, receipt options, branding) per store, cached by the kiosk.

### 4.7 Staff, roles, and access

- **FR-A01** Roles: `admin`, `manager`, `cashier`, `kitchen`. Permissions are enforced server-side on every endpoint.
- **FR-A02** Staff authenticate with email + password; sessions use short-lived tokens with refresh or Sanctum token expiry.
- **FR-A03** Admins shall invite/create users, assign roles, and scope managers/cashiers to one or more stores.
- **FR-A04** Refunds above a configurable threshold shall require `manager` or `admin`.
- **FR-A05** All privileged actions (refund, menu delete, price change, user/role change, kiosk token revoke) shall be written to an audit log.
- **FR-A06** Passwords shall be hashed with a modern algorithm; login shall be rate-limited and support optional TOTP MFA for admins.

### 4.8 Reporting

- **FR-R01** Managers shall view daily sales: order count, gross, discounts, tax, net, by payment method and by product.
- **FR-R02** Reports shall be filterable by store and date range (max 366 days) and exportable as CSV.
- **FR-R03** Reports shall reflect refunds and cancelled orders separately from net sales.
- **FR-R04** Dashboard shall show live counts of orders by status for the current day.

### 4.9 Receipts and notifications

- **FR-N01** The system shall generate a receipt payload (store details, order number, items, modifiers, totals, payment method, timestamp, tax breakdown).
- **FR-N02** Optional email receipt shall be queued and retried; failures must not block order completion.
- **FR-N03** Optional webhook/event on order paid and order completed for external integrations, signed and retried with backoff.

### 4.10 Administration and audit

- **FR-AD01** The API shall expose a health endpoint and structured logs with request IDs.
- **FR-AD02** The admin panel shall display an audit trail filterable by actor, action, and entity.
- **FR-AD03** Configuration (tax rates, payment methods, receipt options, idle timeout) shall be editable without a deployment.

---

## 5. Business rules

1. **Money** is stored and calculated as integer minor units. No floating-point arithmetic in totals.
2. **Tax** is defined per store as a rate in basis points (e.g. 825 = 8.25%). Exclusive tax is added to the subtotal; inclusive tax is extracted from it. Rounding is half-up at the line level, then summed, with a documented reconciliation rule for the order total.
3. **Discounts** apply to the subtotal before tax. Fixed discounts are capped at the subtotal.
4. **Unit price** = product base price + selected variant delta + sum of modifier deltas (modifier quantity multiplied).
5. **Line total** = unit price × quantity. **Order subtotal** = sum of line totals. **Order total** = subtotal − discount + tax.
6. **Availability** is the AND of: product active, category active, store active, current time within optional window, and manual availability flag.
7. **Order numbers** reset daily per store and skip cancelled/unpaid expired orders during reuse only after the day closes; within a day numbers are never reused.
8. **Refunds** may be full or partial, may not exceed the captured amount, and are idempotent per payment.
9. **Device tokens** are scoped to one kiosk and one store. A token cannot read another store's data.
10. **Historical integrity**: order line data is immutable after payment except through refund/cancel records.

---

## 6. Non-functional requirements

### 6.1 Performance

- Menu payload for 200 products / 60 categories: < 300 KB gzipped, served in < 500 ms p95.
- Order creation and total calculation: < 400 ms p95 server time.
- Kiosk interaction response: < 100 ms local; optimistic UI where safe.
- Admin order queue refresh: <= 5 s polling or push; no full page reload.
- Reports for 90 days / 100k orders: < 3 s p95.

### 6.2 Availability and resilience

- Target 99.9% monthly API availability during store hours.
- Kiosk shows a friendly offline state and retries with exponential backoff; it must not lose the cart on transient failure.
- Payment confirmation must survive kiosk crashes (server-side webhook is the source of truth).
- Database backups: daily full + point-in-time recovery; documented restore drill quarterly.

### 6.3 Security and privacy

- TLS 1.2+ everywhere; HSTS in production.
- OWASP Top 10 controls; validation via Form Requests, parameterized queries, escaped output, CSRF protection on cookie-based flows.
- PCI DSS SAQ A/A-EP scope only: no raw card data touches Keyosk servers. Use hosted fields/SDK tokenization.
- Secrets in environment/secret manager, never in the repo.
- PII minimized: no customer accounts; optional name/email stored only for receipts and purged after the retention window.
- Rate limiting on auth, promo validation, order creation, and payment endpoints.
- Audit log is append-only at the application layer.

### 6.4 Accessibility and usability

- WCAG 2.1 AA for kiosk and admin.
- Kiosk operable with touch only; no hover-dependent actions; no time-limited interactions except the configurable idle reset with warning.
- Support 1280×800 and 1920×1080 kiosk displays; responsive admin from 1280 px up.
- Localization-ready: all user-facing strings in translation files; RTL-safe layout.

### 6.5 Observability

- Structured JSON logs with request ID, store ID, kiosk ID, user ID, order ID.
- Metrics: request rate/latency/errors, order conversion funnel, payment success rate, kiosk online count, queue depth.
- Alerts: payment success rate drop, 5xx spike, kiosk fleet offline, queue backlog.
- Error tracking (e.g. Sentry) for API and frontends.

### 6.6 Maintainability

- API versioned under `/api/v1`; breaking changes require a new version.
- OpenAPI spec generated/validated in CI.
- >= 80% backend feature coverage on order/payment paths; frontend critical-flow tests.
- Migrations reversible; seeders produce a demo store.

---

## 7. Constraints and assumptions

- Single organization, multiple stores. No tenant isolation beyond store scoping.
- Kiosks have a persistent internet connection; brief outages tolerated, full offline ordering is out of scope.
- Payment provider: Stripe (Payment Intents) for card; abstraction layer allows adding another provider.
- Backend runs PHP 8.3+ / Laravel 11+; database MySQL 8+ (PostgreSQL-compatible schema preferred).
- Frontend targets evergreen Chromium on kiosk hardware.
- Currency is per store and fixed for the store's orders; no multi-currency orders.
- Card terminal peripherals are integrated by the browser/provider SDK, not by native drivers in v1.

---

## 8. Out of scope / future

- Inventory decrementing and stock counts.
- Loyalty, gift cards, customer accounts, saved payment methods.
- Kitchen display hardware, printer drivers, cash drawer drivers.
- Scheduled/split orders, table service, tips (tips are a v1.1 candidate).
- Native apps and offline-first ordering.
- Multi-currency and multi-language content authoring (structure only in v1).

---

## 9. Acceptance criteria (release gate)

A release is acceptable when:

1. A customer can complete a card order end-to-end on a registered kiosk, including modifier selection, promo code, payment, and receipt.
2. Server totals match an independent recomputation for a fixture suite covering tax-inclusive, tax-exclusive, discounts, variants, and modifier quantities.
3. Duplicate payment retries never create two successful charges (idempotency test).
4. Managers can create a product, attach modifiers, publish it, and see it on the kiosk within 60 seconds.
5. Role permissions are verified by tests: cashier cannot edit menu or refund above threshold; kitchen cannot view revenue reports.
6. Kiosk token revocation disables ordering within one heartbeat interval.
7. All FRs marked v1 have an automated or documented manual test in `QA_REPORT.md`.
8. Accessibility audit passes WCAG 2.1 AA for the kiosk checkout flow.
9. Load test meets the performance targets in §6.1.
10. Backup restore and payment webhook replay drills pass.

---

## 10. Open questions

| # | Question | Owner | Needed by |
| --- | --- | --- | --- |
| 1 | Which payment provider accounts/terminals are available per region? | Ops | Phase 2 |
| 2 | Are tips expected at launch? | Product | Phase 1 |
| 3 | Receipt printing: browser print vs. ESC/POS service? | Hardware | Phase 3 |
| 4 | Tax rules for multiple jurisdictions within one store? | Finance | Phase 1 |
| 5 | Data retention period for customer name/email? | Legal | Phase 2 |
| 6 | Is a kitchen display in scope for launch instead of the admin queue? | Product | Phase 1 |
