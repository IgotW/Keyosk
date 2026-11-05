# Keyosk — QA Report

**Status:** Pre-implementation baseline
**Last updated:** 2026-11-05
**Release under test:** none (v1.0 not yet built)
**Prepared by:** QA

---

## 1. Summary

No application code exists yet. This report defines the test plan, environments, and evidence format that will be used for v1.0. It is updated at each milestone gate and continuously during hypercare.

| Area | Planned | Executed | Passed | Failed | Blocked |
| --- | --- | --- | --- | --- | --- |
| Backend unit | — | 0 | 0 | 0 | — |
| Backend feature/API | — | 0 | 0 | 0 | — |
| Frontend unit/component | — | 0 | 0 | 0 | — |
| End-to-end | — | 0 | 0 | 0 | — |
| Accessibility | — | 0 | 0 | 0 | — |
| Performance/load | — | 0 | 0 | 0 | — |
| Security | — | 0 | 0 | 0 | — |
| UAT (store staff) | — | 0 | 0 | 0 | — |

**Release recommendation:** Not applicable — pre-implementation.

---

## 2. Environments

| Env | Build | Backend | Database | Payments | Notes |
| --- | --- | --- | --- | --- | --- |
| local | — | Laravel dev server | MySQL 8 (Docker) | Provider fake | Developer machines |
| CI | per commit | PHP-FPM + Nginx | MySQL 8 service | Provider fake | GitHub Actions |
| staging | — | Same as prod topology | MySQL 8 | Stripe test mode | UAT, Playwright, load |
| production | — | — | — | Stripe live | Pilot + rollout |

Target kiosk hardware: Chromium, 1280×800 and 1920×1080, touch input, 4 GB RAM.
Admin browser support: latest Chrome, Edge, Firefox, Safari (last two major versions).

---

## 3. Test scope

### 3.1 In scope (v1.0)

- Kiosk: attract, menu browsing, search, product customization, cart, promo, checkout, card and cash flows, receipts, idle reset, offline/error states.
- Admin: login/MFA, stores, users/roles, kiosks/pairing, catalog CRUD, promo codes, order queue, transitions, refunds, reports/exports, audit log.
- API: auth, authorization/scoping, validation, state machine, totals, idempotency, webhooks, rate limits, error format.
- NFRs: performance targets, WCAG 2.1 AA, security controls, backup/restore, observability.

### 3.2 Out of scope (v1.0)

- Native mobile apps, loyalty, inventory, kitchen hardware, multi-currency orders (see `REQUIREMENTS.md` §8).
- Load beyond stated peak assumptions (defined in Phase 6).
- Third-party integrations other than Stripe and outbound webhooks.

---

## 4. Test cases

Status values: `Not run`, `Pass`, `Fail`, `Blocked`, `N/A`.
Evidence links should point to CI runs, Playwright traces, screenshots, or k6 summaries.

### 4.1 Kiosk — browsing and cart

| ID | Requirement | Scenario | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-K-001 | FR-K01 | Kiosk boots with valid token | Attract screen with store name within 2 s | Not run | |
| TC-K-002 | FR-K02 | Menu loads | Active categories/products, correct starting prices | Not run | |
| TC-K-003 | FR-K03 | Search "latte" with different case | Matching products returned | Not run | |
| TC-K-004 | FR-K04 | Product `is_available=false` | Disabled + "Unavailable", cannot add | Not run | |
| TC-K-005 | FR-K05 | Required modifier group unselected | "Add to cart" disabled | Not run | |
| TC-K-006 | FR-K05 | Exceed `max_select` | Selection blocked with explanation | Not run | |
| TC-K-007 | FR-K06 | Edit line modifiers after add | Cart price updates correctly | Not run | |
| TC-K-008 | FR-K07 | Quantity change | Totals update < 100 ms, correct cents | Not run | |
| TC-K-009 | FR-K08 | Refresh mid-cart | Cart restored | Not run | |
| TC-K-010 | FR-K09 | Idle 120 s | Warning then reset; unpaid cart handled per spec | Not run | |
| TC-K-011 | FR-K11 | Invalid promo | Specific reason shown | Not run | |
| TC-K-012 | FR-K12 | Keyboard/screen-reader pass on cart | WCAG 2.1 AA checks pass | Not run | |

### 4.2 Kiosk — payment

| ID | Requirement | Scenario | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-P-001 | FR-P01 | Confirm total | Total restated before pay | Not run | |
| TC-P-002 | FR-P02 | Card payment success (Stripe test) | Order paid, number shown | Not run | |
| TC-P-003 | FR-P02 | Pay at counter | Order held, staff can record cash | Not run | |
| TC-P-004 | FR-P03 | Inspect network/logs | No raw PAN/CVC stored or logged | Not run | |
| TC-P-005 | FR-P04 | Declined card | Retry path shown, order not paid | Not run | |
| TC-P-006 | FR-P05 | Forge client "paid" call | Server rejects/ignores; order unpaid | Not run | |
| TC-P-007 | FR-P06 | Double-click pay / retry same key | One intent, one charge | Not run | |
| TC-P-008 | FR-P08 | Drop network mid-confirm | Poll/sync reconciles correctly | Not run | |
| TC-P-009 | FR-P09 | Revoke device token | Ordering locked, "see staff" | Not run | |
| TC-P-010 | FR-P05, FR-N03 | Webhook replay ×3 | Single state change, no double credit | Not run | |

### 4.3 Orders and fulfilment

| ID | Requirement | Scenario | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-O-001 | FR-O01 | Orders across midnight store-local | Numbers reset, no reuse within day | Not run | |
| TC-O-002 | FR-O02 | Each allowed transition | Succeeds, history row written | Not run | |
| TC-O-003 | FR-O02 | Illegal transition (e.g. ready→paid) | 409, no state change | Not run | |
| TC-O-004 | FR-O05 | Kitchen advances paid→preparing→ready | Allowed; cashier completes | Not run | |
| TC-O-005 | FR-O06 | Cancel paid order | Refund or reason required | Not run | |
| TC-O-006 | FR-O07 | Edit product after order | Order snapshots unchanged | Not run | |
| TC-O-007 | FR-O08 | Tampered client total | Rejected with TOTAL_MISMATCH | Not run | |
| TC-O-008 | FR-O09 | Abandon draft 15 min | Expired, not payable | Not run | |

### 4.4 Catalog and promos

| ID | Requirement | Scenario | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-M-001 | FR-M01–M04 | Create product with variants + groups | Appears correctly on kiosk | Not run | |
| TC-M-002 | FR-M05 | Toggle availability | Reflected on kiosk ≤ 60 s | Not run | |
| TC-M-003 | FR-M07 | Delete product | Soft-deleted; historical order intact | Not run | |
| TC-M-004 | FR-M08 | Upload 6 MB / wrong type | Rejected with 422 | Not run | |
| TC-D-001 | FR-D01–D02 | Redeem promo at max limit | Rejected atomically | Not run | |
| TC-D-002 | FR-D03 | 100% discount + tax | Total never negative; tax correct | Not run | |
| TC-D-003 | FR-D04 | Historical order after code edit | Snapshot unchanged | Not run | |

### 4.5 Devices, auth, roles

| ID | Requirement | Scenario | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-A-001 | FR-KD01–KD02 | Pair with expired code | 401/422, no token | Not run | |
| TC-A-002 | FR-KD02 | Re-pair same serial | Previous token revoked | Not run | |
| TC-A-003 | FR-KD03 | Stop heartbeat | Shows offline after 90 s | Not run | |
| TC-A-004 | FR-A01 | Role matrix for every endpoint | Only permitted roles succeed | Not run | |
| TC-A-005 | FR-A04 | Refund above threshold as cashier | 403 approval required | Not run | |
| TC-A-006 | FR-A05 | Privileged actions | Audit rows with actor + before/after | Not run | |
| TC-A-007 | FR-A06 | Login brute force | Rate limited after 5 attempts | Not run | |

### 4.6 Reports and admin

| ID | Requirement | Scenario | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-R-001 | FR-R01 | Daily totals vs fixture orders | Exact reconciliation | Not run | |
| TC-R-002 | FR-R02 | Export 366+ days | Rejected; 90-day export succeeds | Not run | |
| TC-R-003 | FR-R03 | Refunded/cancelled orders | Reported separately, not in net | Not run | |
| TC-R-004 | FR-R04 | Dashboard status counts | Match DB in real time | Not run | |
| TC-N-001 | FR-N01–N03 | Receipt + outbound webhook | Receipt correct; webhook signed/retried | Not run | |

### 4.7 Non-functional

| ID | Requirement | Scenario | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-NFR-001 | §6.1 | Menu 200 products, 100 concurrent | p95 < 500 ms, < 300 KB gz | Not run | |
| TC-NFR-002 | §6.1 | Order create load | p95 < 400 ms server time | Not run | |
| TC-NFR-003 | §6.1 | 90-day report, 100k orders | p95 < 3 s | Not run | |
| TC-NFR-004 | §6.2 | API outage 60 s during browse | Kiosk recovers, cart intact | Not run | |
| TC-NFR-005 | §6.2 | Backup restore drill | RPO/RTO documented and met | Not run | |
| TC-NFR-006 | §6.3 | OWASP Top 10 checklist | No high/critical issues | Not run | |
| TC-NFR-007 | §6.4 | axe on kiosk/admin critical flows | No serious/critical violations | Not run | |
| TC-NFR-008 | §6.5 | Alert: payment success drop | Alert fires within 5 min | Not run | |

---

## 5. Defect log

| ID | Severity | Area | Summary | Status | Owner | Linked test |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | No defects logged (no build yet) | — | — | — |

Severity definitions:

| Severity | Definition | Fix SLA |
| --- | --- | --- |
| S1 / Critical | Data loss, double charge, security breach, kiosk fleet down | Immediate; release blocked |
| S2 / High | Core flow broken, wrong totals, payment failure | < 24 h; release blocked |
| S3 / Medium | Workaround exists, cosmetic in core flow | < 5 days |
| S4 / Low | Minor cosmetic or edge case | Backlog |

---

## 6. Entry and exit criteria

### Entry (per test cycle)

- Build deployed to staging and smoke test passed.
- Migrations + seeders applied; demo menu available.
- Test accounts for every role; at least one paired kiosk.
- Provider test keys configured; webhook endpoint reachable.
- `docs/API_DOCUMENTATION.md` matches the deployed build.

### Exit (release)

- All S1/S2 defects closed; S3 accepted by product with a dated plan.
- 100% of in-scope test cases executed; ≥ 95% pass; remainder explicitly waived.
- Backend money/state unit coverage 100%; feature suite green.
- Load targets met; accessibility audit passed; security review has no highs/criticals.
- UAT sign-off by store operations.
- Rollback and incident runbooks verified.

---

## 7. Evidence and reporting

- CI: test reports and coverage published per commit.
- E2E: Playwright HTML report + traces retained 30 days.
- Load: k6 summary JSON + Grafana snapshot per run.
- A11y: axe JSON + manual checklist with screenshots.
- UAT: signed scenario sheet with device, build SHA, and tester.
- This report is updated at each milestone gate (M0–M7) and daily during hypercare.

---

## 8. Change history

| Date | Change | Author |
| --- | --- | --- |
| 2026-11-05 | Initial test plan and case inventory created (pre-implementation) | QA |
