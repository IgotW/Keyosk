# Keyosk — Implementation Plan

**Status:** Draft v1.0
**Last updated:** 2026-11-05
**Target release:** v1.0 (12 weeks from kickoff)

---

## 1. Stack and tooling

### Backend (`backend/`)

| Concern | Choice |
| --- | --- |
| Language | PHP 8.3+ |
| Framework | Laravel 12.x (minimum 11) |
| Auth | Laravel Sanctum (staff + kiosk tokens), optional TOTP MFA |
| Database | MySQL 8.0+ (InnoDB, `utf8mb4`) |
| Cache/queue | Redis 7 (database cache + Horizon in production) |
| Payments | Stripe PHP SDK (Payment Intents, Refunds, webhooks) |
| Files | S3-compatible object storage, signed/CDN URLs |
| Testing | Pest 3 (PHPUnit 11 underneath), `RefreshDatabase` |
| Static analysis | Larastan level 6, Pint |
| API docs | OpenAPI 3.1 generated/validated in CI |

### Frontend (`frontend/`)

| Concern | Choice |
| --- | --- |
| Language | TypeScript 5.x (strict) |
| Framework | React 19 |
| Build | Vite 7 |
| Routing | React Router 7 (data router) |
| Server state | TanStack Query 5 |
| Forms/validation | React Hook Form + Zod |
| Styling | Tailwind CSS 4 + CSS variables for theming |
| Client state | Zustand 5 (cart, kiosk session) |
| HTTP | `fetch` wrapper with auth + retry + request IDs |
| i18n | `i18next` / `react-i18next` |
| Tests | Vitest + Testing Library, Playwright (E2E), axe-core (a11y) |
| Lint/format | ESLint 9 (flat config), Prettier |

### Infrastructure

- Docker Compose for local (PHP-FPM, Nginx, MySQL, Redis, Mailpit).
- GitHub Actions CI; images deployed to staging/production.
- Sentry for API and both frontends.
- k6 for load tests.

---

## 2. Repository layout (target)

```
keyosk/
├── backend/                  # Laravel application root
│   ├── app/
│   │   ├── Actions/          # single-purpose use cases (orders, payments)
│   │   ├── Enums/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/{Kiosk,Admin}/
│   │   │   ├── Requests/
│   │   │   ├── Resources/
│   │   │   └── Middleware/
│   │   ├── Models/
│   │   ├── Policies/
│   │   ├── Services/         # totals, payments, promos, receipts
│   │   └── Jobs/
│   ├── database/{migrations,seeders,factories}
│   ├── routes/api.php
│   ├── tests/{Feature,Unit}
│   └── ...
├── frontend/                 # React + Vite application root
│   ├── src/
│   │   ├── apps/kiosk/       # customer-facing surface
│   │   ├── apps/admin/       # staff surface
│   │   ├── components/ui/
│   │   ├── features/{cart,menu,orders,payments,catalog,reports}/
│   │   ├── lib/              # api client, money, formatting, auth
│   │   ├── i18n/
│   │   └── main.tsx
│   ├── e2e/
│   └── vite.config.ts
├── docs/                     # this documentation set + openapi.yaml
├── .opencode/{agents,skills}/
├── AGENTS.md
├── opencode.json
├── docker-compose.yml
└── README.md
```

Surfaces are route-separated (`/kiosk/*`, `/admin/*`) with lazy-loaded chunks so a kiosk never downloads admin code.

---

## 3. Team and capacity assumptions

| Role | Allocation |
| --- | --- |
| Backend engineer | 2.0 FTE |
| Frontend engineer | 2.0 FTE |
| Product/design | 0.5 FTE |
| QA | 0.5 FTE (full-time from Phase 4) |
| DevOps | 0.25 FTE |

Estimates below are elapsed working days for the whole team, not per person. They assume the requirements in `REQUIREMENTS.md` are stable; scope changes go through a change log.

---

## 4. Phases

### Phase 0 — Foundations (Days 1–5)

**Goal:** every developer can run the stack and CI is green before feature work.

| ID | Task | Acceptance |
| --- | --- | --- |
| P0-1 | Initialise Laravel in `backend/`, React+Vite in `frontend/` | `php artisan serve` and `npm run dev` both work |
| P0-2 | Docker Compose: PHP, Nginx, MySQL 8, Redis, Mailpit | `docker compose up` from clean clone |
| P0-3 | CI: Pint, Larastan, Pest, ESLint, tsc, Vitest, build | PR blocked on failures |
| P0-4 | Base API envelope, error handler, request-ID middleware | Error format matches API doc |
| P0-5 | OpenAPI skeleton + docs lint | Spec validates in CI |
| P0-6 | `.env.example`, README quick start, `AGENTS.md`, `opencode.json` | New dev onboarded in < 30 min |
| P0-7 | Sentry + structured logging baseline | Errors visible in staging |

**Deliverable:** green pipeline, documented local setup, empty deployable app.

---

### Phase 1 — Stores, staff, kiosks (Days 6–12)

**Goal:** devices can pair; staff can log in with correct scopes.

| ID | Task | Acceptance |
| --- | --- | --- |
| P1-1 | Migrations + models: stores, users, user_store, kiosks, audit_logs | Migration up/down tested |
| P1-2 | Staff auth (Sanctum), role middleware, store scoping policy | Feature tests for every role |
| P1-3 | Store CRUD API + admin screens | Manager sees only assigned stores |
| P1-4 | User CRUD + role assignment + MFA (admin) | Cashier cannot access user endpoints |
| P1-5 | Kiosk registration, pairing-code exchange, token rotation | Pairing code single-use, 30-min expiry |
| P1-6 | Heartbeat + online/offline detection | Kiosk shows offline after 90 s |
| P1-7 | Audit log for privileged actions | Refund/menu/user changes recorded |
| P1-8 | Kiosk shell: attract screen, pairing screen, config fetch | Runs on target hardware |

**Deliverable:** a paired kiosk can fetch config; admin can manage staff and devices.

---

### Phase 2 — Catalog and menu management (Days 13–22)

**Goal:** a manager can publish a complete menu without engineering help.

| ID | Task | Acceptance |
| --- | --- | --- |
| P2-1 | Migrations/models: tax_rates, categories, products, variants, modifier groups/modifiers, pivot | FK + invariant tests |
| P2-2 | Admin CRUD APIs with validation | Contract tests vs API doc |
| P2-3 | Image upload to S3 + signed URL serving | Type/size validation, CDN URL |
| P2-4 | `GET /kiosk/menu` with ETag + 60 s cache | p95 < 500 ms for 200 products |
| P2-5 | Admin catalog UI: list, search, edit, drag-to-sort | Usable at 1280 px |
| P2-6 | Product editor: variants, modifier groups, availability | Min/max enforcement preview |
| P2-7 | Promo code CRUD + validation service | Concurrency test for redemption cap |
| P2-8 | Seeders + demo data | `php artisan migrate:fresh --seed` produces demo menu |

**Deliverable:** end-to-end menu authoring; kiosk renders live menu.

---

### Phase 3 — Kiosk ordering UI (Days 23–32)

**Goal:** a customer can build a cart and reach checkout.

| ID | Task | Acceptance |
| --- | --- | --- |
| P3-1 | Menu browse, category nav, search, unavailable states | FR-K01–K05 pass |
| P3-2 | Product detail with variant/modifier selection + validation | "Add" disabled until required groups valid |
| P3-3 | Cart store (Zustand + persistence), edit/remove, price preview | Cart survives refresh |
| P3-4 | Promo code UI + error reasons | Invalid codes explained |
| P3-5 | Idle timeout, warning dialog, reset | Default 120 s, configurable |
| P3-6 | Order create API + server totals integration | `TOTAL_MISMATCH` handled gracefully |
| P3-7 | Accessibility pass on browse/cart | axe + manual WCAG 2.1 AA checklist |
| P3-8 | Kiosk E2E happy path (Playwright) | Stable in CI |

**Deliverable:** demo mode lets a customer build an order; no payment yet.

---

### Phase 4 — Payments and order lifecycle (Days 33–42)

**Goal:** real card payment, correct states, no double charges.

| ID | Task | Acceptance |
| --- | --- | --- |
| P4-1 | Order state machine + transition guards + history | Illegal transitions return 409 |
| P4-2 | Totals service (tax inclusive/exclusive, discounts, allocation) | Fixture suite matches expected cents |
| P4-3 | Stripe PaymentIntent creation + idempotency keys | Duplicate retry returns same intent |
| P4-4 | Stripe webhook: signature verify, idempotent handling, queue jobs | Replay does not double-pay |
| P4-5 | Kiosk payment UI: confirm, success, decline, timeout, poll/sync | No client-side "paid" assertion |
| P4-6 | Cash-at-counter flow + staff "record cash payment" | Change calculation correct |
| P4-7 | Order expiry job (TTL 15 min) + number release policy | Expired orders not payable |
| P4-8 | Receipt payload + kiosk success screen + email queue | Email failure does not block |
| P4-9 | Payment integration tests against Stripe test mode / fake | CI runs without live network |

**Deliverable:** full card and cash order flow on staging.

---

### Phase 5 — Fulfilment, refunds, reporting (Days 43–52)

| ID | Task | Acceptance |
| --- | --- | --- |
| P5-1 | Admin order queue + detail (items, payments, history) | Live refresh ≤ 5 s |
| P5-2 | Transition actions with role checks | Kitchen cannot refund |
| P5-3 | Refund flow: full/partial, threshold approval, provider sync | Cannot exceed captured |
| P5-4 | Reports: daily sales, product ranking, payment breakdown | Totals reconcile to orders |
| P5-5 | CSV export (streamed) + date-range limits | 366-day guard |
| P5-6 | Dashboard status counts | Matches DB |
| P5-7 | Audit log UI | Filter by actor/action/date |
| P5-8 | Outbound webhooks with signing + retries | Dead-letter after 5 attempts |

**Deliverable:** staff can run a full day including refunds and reporting.

---

### Phase 6 — Hardening and pilot (Days 53–60)

| ID | Task | Acceptance |
| --- | --- | --- |
| P6-1 | Load test (k6): menu, order create, payment webhook | Meets §6.1 targets |
| P6-2 | Security review: OWASP checklist, dependency audit, pen-test fixes | No high/critical findings |
| P6-3 | Accessibility audit (external or structured internal) | WCAG 2.1 AA on kiosk checkout |
| P6-4 | Failure drills: DB restore, webhook replay, kiosk offline, provider outage | Documented runbook passes |
| P6-5 | Observability: dashboards + alerts (payment rate, 5xx, kiosks offline) | Alerts fire in staging |
| P6-6 | UAT with store staff on real hardware | Sign-off checklist |
| P6-7 | Pilot at one store (limited hours) | No P1 defects for 3 consecutive days |
| P6-8 | Runbooks: deploy, rollback, incident, refund/dispute | Reviewed by on-call |

**Deliverable:** pilot store live; release candidate tagged.

---

### Phase 7 — Launch and hypercare (Days 61–84)

| ID | Task | Acceptance |
| --- | --- | --- |
| P7-1 | Production rollout per store with smoke tests | Smoke script passes each store |
| P7-2 | Staff training + quick-reference cards | All store staff trained |
| P7-3 | Hypercare: daily triage, hotfix SLA (P1 < 4 h) | Logged in `QA_REPORT.md` |
| P7-4 | Post-launch review + v1.1 backlog | Prioritised, estimated |

---

## 5. Milestones and gates

| Milestone | End of | Gate |
| --- | --- | --- |
| M0 Foundations | Week 1 | CI green, stack runs from clean clone |
| M1 Identity & devices | Week 2 | Kiosk pairing + role scoping proven |
| M2 Menu live | Week 4 | Menu authored in admin appears on kiosk |
| M3 Cart complete | Week 6 | Order created with server-verified totals |
| M4 Payments | Week 8 | Card + cash E2E on staging |
| M5 Operations | Week 10 | Refunds, reports, queue, audit usable |
| M6 Release candidate | Week 11 | Load/a11y/security gates pass, UAT signed |
| M7 Launch | Week 12 | Pilot stable, rollout complete |

---

## 6. Testing strategy

| Layer | Scope | Tooling | Gate |
| --- | --- | --- | --- |
| Unit (BE) | Totals, promo math, state machine, number generator | Pest | 100% on money logic |
| Feature (BE) | Every endpoint: auth, validation, scoping, transitions | Pest + MySQL | Required for merge |
| Contract | Response shapes vs `docs/openapi.yaml` | Schemathesis or custom | CI |
| Unit (FE) | Price formatting, cart reducers, validation schemas | Vitest | Required |
| Component (FE) | Product detail, cart, checkout states | Testing Library | Required |
| E2E | Pair → browse → customize → pay (fake) → receipt; admin refund | Playwright | Nightly + pre-release |
| Accessibility | Kiosk + admin critical flows | axe-core + manual | Pre-release |
| Load | Menu read, order create, webhook throughput | k6 | Pre-release |
| Security | OWASP checklist, `composer audit`, `npm audit`, DAST | Manual + CI | Pre-release |
| UAT | Real staff, real device, scripted scenarios | Manual | Release gate |

Test data:

- Factories for every model; deterministic money fixtures in `tests/Fixtures/totals/*.json`.
- Payment provider faked at the HTTP layer (no live calls in CI).
- A `demo` seeder is used by Playwright and staging.

---

## 7. CI/CD

### Pipeline (GitHub Actions)

1. **Backend:** `composer install` → Pint `--test` → Larastan → Pest (MySQL + Redis services) → OpenAPI validation.
2. **Frontend:** `npm ci` → ESLint → `tsc --noEmit` → Vitest → `vite build` → Playwright (nightly/pre-release).
3. **Build:** Docker image tagged with commit SHA; frontend assets uploaded to object storage/CDN.
4. **Deploy staging:** automatic on `main`; run migrations; smoke tests; notify.
5. **Deploy production:** manual approval; blue/green or rolling; migrations are backward-compatible; smoke test per store.

### Environments

| Env | Purpose | Payments | Data |
| --- | --- | --- | --- |
| local | Development | Fake | Seeded |
| staging | Integration/UAT | Stripe test | Anonymised/seeded |
| production | Live stores | Stripe live | Real |

### Rollback

- Application: redeploy previous image tag (migrations must be backward-compatible for one release).
- Feature flags for kiosk payment methods and reporting exports.
- Database restore from PITR only with incident lead approval.

---

## 8. Risks

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Payment provider onboarding delays | Medium | High | Start account setup in Phase 0; ship cash flow first; provider abstraction |
| R2 | Kiosk hardware/network instability | Medium | High | Heartbeats, offline UI, retry/backoff, pilot on real hardware early |
| R3 | Tax rounding disputes | Medium | Medium | Documented algorithm + reconciliation fixtures + finance sign-off |
| R4 | Scope creep (loyalty, tips, KDS) | High | Medium | Non-goals enforced; v1.1 backlog |
| R5 | Double charges under retry | Low | Critical | Idempotency keys, unique constraints, webhook as source of truth |
| R6 | Accessibility gaps found late | Medium | Medium | Continuous axe checks, Phase 3 audit, external audit in Phase 6 |
| R7 | Menu content quality (images, descriptions) | Medium | Low | Content templates + manager checklist before pilot |
| R8 | Single-store pilot not representative | Low | Medium | Pilot includes peak-hour test; second store in rollout week |
| R9 | Team unfamiliar with Laravel 12 / React 19 | Low | Medium | Phase 0 spike + pair programming |
| R10 | Reporting performance on large ranges | Medium | Medium | Pre-aggregated daily table if p95 exceeds 3 s |

---

## 9. Definition of done

A task is done when:

- Code reviewed and merged to `main`.
- Tests added/updated and passing in CI; money/state logic has direct coverage.
- API changes reflected in `API_DOCUMENTATION.md` and OpenAPI spec.
- No new lint, type, or static-analysis errors.
- Feature works on the target kiosk resolution and passes keyboard/screen-reader smoke check where applicable.
- Audit events added for privileged actions.
- Observability: logs/metrics for new failure modes.
- Documentation/runbook updated if operational behaviour changed.
- Acceptance criteria in this plan and the linked FR are demonstrably met.

---

## 10. First two weeks — concrete checklist

**Week 1**

- [ ] `laravel new backend` (or `composer create-project`), configure MySQL/Redis, `.env.example`.
- [ ] `npm create vite@latest frontend -- --template react-ts`, Tailwind, Router, Query, ESLint/Prettier.
- [ ] Docker Compose + Makefile/scripts (`make up`, `make test`, `make lint`).
- [ ] CI workflow with backend and frontend jobs.
- [ ] Base controller, API resource envelope, exception renderer, request-ID middleware.
- [ ] `AGENTS.md`, `opencode.json`, `.opencode/` scaffolding.
- [ ] ADR-001 stack, ADR-002 money/tax representation, ADR-003 auth model.

**Week 2**

- [ ] Stores/users/kiosks migrations + models + factories.
- [ ] Sanctum staff auth + role middleware + store scope policy.
- [ ] Kiosk pairing + heartbeat + remote config.
- [ ] Admin login screen + store switcher.
- [ ] Kiosk attract + pairing screens.
- [ ] Audit log subscriber for auth/user/kiosk events.
- [ ] First Playwright test: pair a kiosk and reach attract screen.

---

## 11. Traceability

| Requirement group | Phase | Primary tests |
| --- | --- | --- |
| FR-K (kiosk browsing/cart) | 3 | Component + E2E |
| FR-P (payment) | 4 | Feature + provider fake + E2E |
| FR-O (orders) | 4–5 | Feature + state-machine unit |
| FR-M (menu) | 2 | Feature + contract |
| FR-D (promotions) | 2, 4 | Unit + concurrency feature |
| FR-KD (devices) | 1 | Feature |
| FR-A (auth/roles) | 1, 5 | Feature (role matrix) |
| FR-R (reports) | 5 | Feature + reconciliation fixtures |
| FR-N (receipts/webhooks) | 4–5 | Feature + job tests |
| NFR performance | 6 | k6 |
| NFR accessibility | 3, 6 | axe + manual audit |
