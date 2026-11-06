# Keyosk - Requirements

**Status:** Approved and implemented (see `docs/IMPLEMENTATION_PLAN.md`, `docs/QA_REPORT.md`)  
**Last updated:** 2026-11-06  
**System type:** Simple web ordering system inspired by a kiosk workflow  
**Delivery target:** 1-2 day assessment build

---

## 1. Overview

Keyosk is a simple website where a customer can browse products, add them to a cart, check out, choose a payment method, and receive an order number and printable receipt.

The system is **inspired by** a kiosk ordering flow, but it is a normal responsive website. It is not a full kiosk platform.

### Confirmed decisions

- The receipt number is the same as the order number.
- Online payment is a mock only. No real payment provider, card processing, or webhook is required.
- The admin needs a simple product management page.
- The tech stack is Laravel, PostgreSQL, and React + Vite.

---

## 2. User roles

| Role | Description | Authentication |
| --- | --- | --- |
| Customer | Browses products, manages a cart, checks out, and views a receipt | None |
| Admin | Logs in, manages products, views orders, marks cash orders paid, and updates order status | Sanctum bearer token |

No cashier, kitchen, manager, or multi-store roles are required for this version.

---

## 3. System workflows

### 3.1 Customer ordering flow

1. Customer opens the storefront.
2. Customer browses available products.
3. Customer adds one or more products to the cart.
4. Customer adjusts quantities or removes items.
5. Customer opens checkout.
6. Customer chooses **Cash** or **Online payment (mock)**.
7. Customer places the order.
8. The API validates the cart, recalculates prices, creates the order, and generates the order number.
9. The customer is taken to a receipt page.
10. The receipt can be printed from the browser.

### 3.2 Cash order flow

1. Order is created with payment status `unpaid`.
2. The receipt is generated and shows that payment is due at the counter.
3. An admin opens the order and marks it `paid` after receiving cash.

### 3.3 Mock online payment flow

1. Order is created with payment method `online`.
2. The API simulates a successful payment and saves `payment_status = paid` with a mock reference.
3. The receipt is generated immediately.
4. No external payment service is contacted.

### 3.4 Admin product flow

1. Admin logs in.
2. Admin opens the product management page.
3. Admin creates, edits, deletes, or toggles the availability of products.
4. The storefront reflects product changes on its next data fetch.

### 3.5 Admin order flow

1. Admin opens the order list.
2. Admin filters by order number or status if implemented.
3. Admin opens an order detail view.
4. Admin marks a cash order as paid.
5. Admin moves the order between `pending`, `completed`, and `cancelled`.

---

## 4. Functional requirements

### 4.1 Customer storefront

- **FR-C01** The storefront shall display available products with name, price, description, and optional image.
- **FR-C02** The storefront shall show an empty state when no products are available.
- **FR-C03** The customer shall be able to add a product to the cart.
- **FR-C04** The customer shall be able to increase or decrease an item quantity and remove an item.
- **FR-C05** The cart shall show each line total and the order total.
- **FR-C06** The cart shall persist in browser storage across refreshes.
- **FR-C07** Checkout shall be blocked when the cart is empty.
- **FR-C08** Unavailable products shall not be orderable.
- **FR-C09** The storefront shall be responsive on desktop, tablet, and mobile widths.
- **FR-C10** Loading, empty, and error states shall be visible and understandable.

### 4.2 Checkout, payment, and receipt

- **FR-O01** Checkout shall show the item summary, total, and payment options: **Cash** and **Online payment**.
- **FR-O02** The API shall validate every checkout request and compute all totals from current database prices. Client-supplied totals shall be ignored.
- **FR-O03** The API shall snapshot product name, unit price, quantity, and line total on each order item.
- **FR-O04** Order creation shall run inside a database transaction.
- **FR-O05** The system shall generate a unique, human-readable order number.
- **FR-O06** The order number shall also be the receipt number.
- **FR-O07** A cash order shall be created with payment status `unpaid`.
- **FR-O08** A mock online order shall be created with payment status `paid` and a mock payment reference.
- **FR-O09** The order response shall include an unguessable public token used to open the receipt.
- **FR-O10** The receipt shall show the order number, items, quantities, line totals, total, payment method, payment status, and order timestamp.
- **FR-O11** The receipt shall be printable from the browser.
- **FR-O12** The receipt shall not require a customer account.

### 4.3 Admin panel

- **FR-A01** An admin shall be able to log in with email and password.
- **FR-A02** The API shall issue a Sanctum bearer token on successful login.
- **FR-A03** Admin routes shall reject unauthenticated users and non-admin users.
- **FR-A04** An admin shall be able to log out and revoke the current token.
- **FR-A05** An admin shall be able to list all products, including unavailable products.
- **FR-A06** An admin shall be able to create a product.
- **FR-A07** An admin shall be able to edit a product.
- **FR-A08** An admin shall be able to delete a product without deleting or changing the snapshot fields of historical order items.
- **FR-A09** An admin shall be able to toggle product availability.
- **FR-A10** An admin shall be able to list orders and open order details.
- **FR-A11** An admin shall be able to mark a cash order as paid.
- **FR-A12** An admin shall be able to move an order between `pending`, `completed`, and `cancelled`.

### 4.4 Data rules

- Money shall be stored as integer minor units (cents). Floating-point money is prohibited.
- Product prices and order totals shall never be negative.
- Quantity shall be an integer from 1 to 99.
- Duplicate product lines in a checkout request shall be rejected.
- An unavailable product shall cause a validation error at checkout.
- An order shall contain at least one item.
- An order number shall be unique.
- A receipt token shall be unique and unguessable.
- Deleting a product shall not delete or modify historical order items.
- Stock counting is out of scope. Availability is a simple boolean toggle.

---

## 5. Non-functional requirements

- **NFR-01** All incoming requests shall be validated server-side.
- **NFR-02** The API shall return consistent JSON success and error responses.
- **NFR-03** The storefront shall load products from the API, not from hardcoded data.
- **NFR-04** The frontend shall centralize API configuration and error handling.
- **NFR-05** The system shall run on PostgreSQL.
- **NFR-06** Backend behavior shall be covered by feature tests.
- **NFR-07** Frontend utilities or key flows shall be covered by Vitest tests.
- **NFR-08** The frontend production build and ESLint check shall pass.
- **NFR-09** The UI shall be usable without horizontal scrolling at common mobile, tablet, and desktop widths.
- **NFR-10** The system shall remain simple enough to complete an assessment build within 1-2 days.

---

## 6. Security requirements

- **SEC-01** Admin passwords shall be hashed; plaintext passwords shall never be stored.
- **SEC-02** Admin authentication shall use Laravel Sanctum bearer tokens.
- **SEC-03** Admin routes shall require both authentication and an admin flag/middleware.
- **SEC-04** Public receipt access shall require an unguessable order token, not a sequential order ID.
- **SEC-05** The API shall recalculate all order prices server-side and ignore client totals.
- **SEC-06** The API shall validate product availability and quantities at checkout.
- **SEC-07** The frontend shall not contain database credentials or backend secrets.
- **SEC-08** CORS shall allow only the configured frontend origin.
- **SEC-09** Login and public order creation shall be rate-limited.
- **SEC-10** The system shall use Eloquent/query bindings to avoid SQL injection.
- **SEC-11** No real card data shall be collected, transmitted, or stored because payment is mocked.
- **SEC-12** Production deployments shall use HTTPS and environment-based secrets.

---

## 7. Database entities (summary)

Detailed design is in `docs/DATABASE_DESIGN.md`.

- `users` - admin accounts and the `is_admin` flag.
- `products` - name, description, price, optional image URL, availability.
- `orders` - order number, public receipt token, payment method, payment status, order status, total.
- `order_items` - historical product name, unit price, quantity, and line total.
- Framework tables already present: sessions, cache, jobs, personal access tokens, migrations.

---

## 8. API requirements (summary)

Detailed contract is in `docs/API_DOCUMENTATION.md`.

- Public product listing.
- Public order creation.
- Public receipt lookup by order token.
- Admin login, logout, and current-user endpoint.
- Admin product CRUD.
- Admin order listing, detail, payment update, and status update.

---

## 9. Assumptions

These assumptions were approved on 2026-11-06 and are the implemented behavior.

- **A1** The MVP uses a single currency configured on the backend; no multi-currency conversion.
- **A2** Products require a name and price; description and image are optional.
- **A3** Multiple admin users may exist in the database, but the MVP has no admin-user management UI and no roles beyond `admin`.
- **A4** Cash orders are created unpaid and an admin marks them paid after receiving cash.
- **A5** Mock online payments always succeed immediately.
- **A6** The order number format is a simple unique human-readable value such as `ORD-000001`.
- **A7** The receipt is a printable HTML page, not a PDF or emailed document.
- **A8** There are no taxes, discounts, promos, delivery fees, or tips.
- **A9** There are no customer accounts and no customer order history.
- **A10** Product deletion is allowed, while order items preserve snapshots of product data.
- **A11** Product images are optional URLs; file upload/storage is not required for the MVP.
- **A12** Pagination and advanced order filtering are optional for the 1-2 day build.
- **A13** The stock wording in the root `AGENTS.md` is interpreted for this build as product availability plus quantity bounds (`1..99`). No inventory count, reservation, or stock-decrement logic is stored.

---

## 10. Open questions (resolved)

All items below were resolved by the approved decisions in `docs/IMPLEMENTATION_PLAN.md` section 9. The list is retained as a record of the clarification questions.

1. What currency and locale should the storefront display? (Assumed single configurable currency.)
2. Should the customer provide a name or order note at checkout? (Assumed no.)
3. Should the admin be able to create additional admin accounts in the UI, or is a seeded admin enough?
4. Should a cash order be marked paid automatically at order creation, or only by an admin? (Assumed admin-only.)
5. Should the mock online payment simulate failure/cancellation, or always succeed? (Assumed always succeed.)
6. Is the proposed order-number format acceptable, or is a specific format required?
7. Should unavailable products be hidden or shown as disabled on the storefront?
8. Should the admin be able to delete products, or only deactivate them?
9. Should the customer be able to reopen a receipt later, or is the post-checkout receipt enough?
10. Are categories, search, or product images required for the assessment demo?
11. Should orders be filterable/paginated, or is a simple recent-orders list acceptable?
12. Is a printable HTML receipt sufficient, or is a downloadable PDF required?
13. Should the root `AGENTS.md` stock wording be updated to match the confirmed no-inventory scope?

---

## 11. Mandatory vs optional

### Mandatory for the 1-2 day assessment build

- Customer product listing.
- Cart add/update/remove.
- Checkout with cash or mock online payment.
- Server-side total calculation and price snapshots.
- Unique order number, also used as receipt number.
- Printable receipt with unguessable receipt token.
- Admin login/logout.
- Admin product list, create, edit, delete, and availability toggle.
- Admin order list/detail, mark cash paid, and update order status.
- Backend feature tests for the critical flows.
- Frontend lint and production build.
- PostgreSQL schema and migrations.

### Optional enhancements

- Product images via upload.
- Categories, search, and filtering.
- Pagination for products and orders.
- Admin user management UI.
- Order notes or customer name.
- PDF receipt or email receipt.
- Tax, discounts, promos, tips, or delivery fees.
- Real online payment provider.
- Refunds and refund history.
- Inventory/stock counts.
- Reporting dashboard.
- Multiple stores, kiosk devices, or staff roles.
- Docker, Redis, queues, or CI.

---

## 12. 1-2 day delivery priority

### Day 1 - Backend foundation

1. PostgreSQL migrations for admin flag, products, orders, and order items.
2. Models, factories, and seed data.
3. Sanctum admin login/logout/current user.
4. Admin product CRUD API.
5. Public product listing and order creation API.
6. Receipt lookup by public token.
7. Admin order list/detail/payment/status API.
8. Backend feature tests for the critical paths.

### Day 2 - Frontend and integration

1. React Router application shell.
2. Central Axios client and auth handling.
3. Storefront product listing and cart.
4. Checkout and payment-method selection.
5. Receipt page with print support.
6. Admin login page.
7. Admin product management page.
8. Admin order list/detail page.
9. Frontend tests for cart/total logic.
10. Lint, test, and production build verification.

If time runs short, prioritize the customer flow, product admin page, and receipt over optional filters, images, and polish.

---

## 13. Acceptance criteria

The version is acceptable when:

1. A customer can browse available products, build a cart, and check out.
2. A cash order is created as unpaid and can be marked paid by an admin.
3. A mock online order is created as paid without calling a real gateway.
4. Every order receives a unique order number, and the receipt number is the same value.
5. The receipt is reachable through an unguessable token and can be printed.
6. An admin can log in, manage products, and manage orders.
7. Product price and name changes do not alter historical order items.
8. Backend feature tests pass against PostgreSQL.
9. Frontend lint, tests, and production build pass.
