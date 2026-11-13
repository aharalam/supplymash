# Order-first backend implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task. Coordinate ownership with the IBM Bob backend team before overlapping edits.

**Goal:** Replace the published stubs with the complete order → pool → inferred scrap → close → metrics demo, while keeping legacy routes working.

**Architecture:** Keep Express controllers thin and retain the in-memory store. Put deterministic pricing, pool state, privacy projections and scrap matching in services; put Granite and Stripe behind bounded adapters with explicit fallbacks. Preserve the published response shapes.

**Tech Stack:** Existing TypeScript, Express 4, tsx; Node test runner; IBM watsonx SDK and Stripe SDK only when their respective integration tasks begin.

**Spec:** `docs/superpowers/specs/2026-11-13-supplymash-order-first-design.md`, especially sections 6–10. Reviewed against `e80425c`, `sec11-impl-plan.md`, and `docs/FRONTEND_HANDOFF.md`.

## Current evidence

- `npm run build` in backend passes.
- New routers and response types exist. Do not rebuild phase 0.
- Orders echo input identifiers but use fixed lines; pools ignore IDs and return fixed data; closing does not persist state; metrics are constants; reset is a no-op.
- Store still has only legacy collections. Business, listing and match extensions remain missing.
- No test script or service layer exists. The lint script references ESLint without declaring it.

## Global constraints

- In-memory storage; preserve legacy routes and the three existing businesses.
- One open pool per supplier; one merged order per business per pool.
- Header-present pool views must never expose another business's identity, lines or invoice. No-header operator mode is a demo convention, not authentication.
- Fallbacks first. Granite timeout: 8 seconds. Validate all model output against the supplier catalog and numeric bounds.
- Test Stripe keys only (`sk_test_`); reject other configured keys. Never use real card data.
- IBM Bob usage evidence remains a team submission requirement; this planning work is not evidence of Bob usage.

## Corrections to the draft and unresolved edges

1. Listing privacy is NOT already solved: `GET /listings?status=proposed` and `GET /listings/:id` currently expose inferred listings. Filter before user-supplied filters and guard detail reads. Guard generic update/delete routes against changing hidden inferred records too.
2. Existing matching already selects only active listings; no redundant proposed-status condition is needed. `GET /matches` does need to hide pending/declined inferred matches.
3. Follow section 8D and the explicit decision: charge, remove declines, reprice once, charge deltas, THEN build the PO. Do not generate it before charging as another paragraph suggests.
4. The claim that repricing can only increase each survivor's charge is not generally true: removing orders can restore a base-price subtotal above the free-delivery threshold. Pin the demo fixture to the intended monotonic case; define treatment of negative deltas before generalizing real payment behavior.
5. Section 9 cannot represent a delta PaymentIntent separately, and says nothing about a second decline or all orders declining. Preserve internal charge-attempt records; do not claim a settled pool with an unpaid delta. These edge semantics need team agreement before the Stripe path ships.
6. Scrap needs persistent `readyInDays`, inferred weight and distance/source information; existing types cannot reconstruct these reliably. Add internal optional metadata without changing response shapes.
7. Model fallback provenance is missing for generated explanations. Do not have the frontend label template text as Granite output. Agree an additive provenance field or neutral wording.

## Review focus

- Duplicate/concurrent submissions and close retries must not double-charge or create two open pools.
- Unknown/mismatched viewer identities must not receive another business's order.
- NaN, Infinity, zero/negative quantities, unknown SKUs and ambiguous text must not enter pricing.
- Delivery rounding must reconcile exactly to the PO, including three-way splits.
- Repeat order merges, reset, and failed asynchronous work must not duplicate scrap or mutate a new demo session.

## Task 1 — Stable seed and real reset

**Files:** modify `backend/src/types/index.ts`, `models/store.ts`, `controllers/businesses.ts`, `controllers/suppliers.ts`, `controllers/demo.ts`; create `backend/tests/seed.test.ts`; update `backend/package.json`.
**Interfaces:** export `seedDatabase(): void`; extend `db` with `suppliers`, `orders`, `pools`; preserve legacy collections. Add required business supplier preferences, proposed listing state/source/order ID, and inferred match direction/price metadata. Newly registered businesses default to an empty supplier list.

- [ ] Add `test: tsx --test tests/*.test.ts`. Write seed/reset tests and observe failure.
- [ ] Seed stable IDs, three catalog suppliers, about ten businesses with coordinates, two farm requests and two pre-parsed Detroit orders. Keep startup seed offline.
- [ ] Choose actual discounted seed totals at 70–80% of free delivery; specify the exact third order that crosses the threshold.
- [ ] Reset every mutable collection, including legacy pools and warehouses; retain the exported `db` object reference.
- [ ] Run seed tests and build. Confirm repeated reset returns equivalent entity counts and valid references.

## Task 2 — Exact pricing and private pool projections

**Files:** create `services/pricing.ts`, `services/pools.ts`, `tests/pricing.test.ts`, `tests/pools.test.ts`; modify `controllers/pools.ts`.
**Interfaces:** `pricePool(pool: Pool): PoolPricing` returns per-order solo/pooled/savings, SKU totals, delivery allocations and PO totals; `getPoolView(pool: Pool, viewerId: string): PoolView`; `getOperatorView(pool: Pool): PoolOperatorView`; `attachOrder(order: Order): Order`.

- [ ] Test base pricing, aggregate SKU tiers, exact free-delivery boundaries, proportional delivery, cent residual allocation, zero subtotal and savings clamping.
- [ ] Calculate money using integer cents; allocate residual cents deterministically so invoice amounts sum to the shipment total.
- [ ] Test merging a second order from the same business, one open pool per supplier, viewer membership filtering and absence of names/IDs/other lines in serialized viewer responses.
- [ ] Implement view projections by allowlisting fields rather than spreading internal objects. Unknown IDs return 404; invalid viewer headers fail explicitly.
- [ ] Run tests and build. Document milestone units clearly: dollar progress for delivery versus quantity progress for a SKU tier.

## Task 3 — Parsing and order creation, entirely offline first

**Files:** create `services/parser.ts`, `services/writer.ts`, `tests/parser.test.ts`, `tests/orders.test.ts`; modify `controllers/orders.ts` and `index.ts`.
**Interfaces:** `parse(text: string, catalog: CatalogItem[]): Promise<{lines: OrderLine[]; parsedBy: 'fallback'|'granite'}>`; template writer functions for explanations and PO email text.

- [ ] Test quantity plus alias phrases, multiple items, duplicate SKUs, overlapping aliases, unrecognized input and invalid numeric quantities.
- [ ] Implement conservative alias parsing; return 422 rather than inventing quantities for ambiguous phrases. Catalog controls names, units and prices.
- [ ] Validate business/supplier existence and string text. When a viewer header is supplied, reject a body businessId mismatch. Require identity for personal order reads.
- [ ] Parse before mutating state, then attach/merge synchronously and return the real viewer-safe pool. Ensure Express 4 asynchronous errors reach a JSON error handler.
- [ ] Run offline order integration tests, including the free-delivery demo order.

## Task 4 — Scrap inference and privacy

**Files:** create `services/scrap.ts`, `tests/scrap.test.ts`; modify `controllers/scrapOffers.ts`, `controllers/listings.ts`, `controllers/matches.ts`, and order integration.
**Interfaces:** `inferAndOffer(order: Order): Promise<ScrapOffer[]>`; `offersForViewer(businessId: string): ScrapOffer[]`; validated holder-only state transitions.

- [ ] Test deterministic lumber inference, nearest eligible request within 60 miles, missing coordinates, no self-match, price capped to request maximum and unit/weight conversion.
- [ ] Use Haversine distance from holder to requester; store quantity provenance and readiness. Process only new order quantities or update pending proposals on merge; never duplicate already accepted waste.
- [ ] Test pending/declined anonymity in inbox text AND every legacy listing/match endpoint, including explicit status queries and detail URLs.
- [ ] Test requester/unknown holder responses return 403, acceptance updates both listings, decline expires the proposal, repeated decisions are stable and incompatible terminal transitions fail.
- [ ] Run the lumber → holder acceptance demo and assert metrics-ready weight/value metadata.

## Task 5 — Mock close and metrics

**Files:** create `services/payments.ts`, `services/metrics.ts`, `tests/close.test.ts`, `tests/metrics.test.ts`; modify pool services/controllers and `controllers/metrics.ts`.
**Interfaces:** `closePool(poolId: string): Promise<{purchaseOrder: PurchaseOrder; invoices: Invoice[]}>`; `computeMetrics(): Metrics`; internal payment adapter injectable in tests.

- [ ] Test mock invoices reconcile to the PO; repeated and concurrent close calls return the stored result without another charge.
- [ ] Reject business-view close requests. Freeze a pool against additions while close is in flight; leave API status shapes unchanged.
- [ ] Implement charge-before-PO with deterministic mock outcomes, explicit failed invoices, and agreed all-declined/delta-failure behavior from the corrections above.
- [ ] Compute metrics from stored invoices/open estimates/accepted scrap, excluding failed payments and avoiding repeated counts. Closed delivery avoidance is never negative.
- [ ] Run tests and rehearse reset → third cafe order → lumber order → accept → close → metrics twice using mock payments and fallback parsing.

## Task 6 — Granite and Stripe adapters

**Files:** create `services/granite.ts` and adapter tests; extend parser/scrap/writer/payments, `.env.example`, and startup validation.

- [ ] Verify current official IBM model availability and SDK APIs at implementation time; do not assume the draft model example is still available. Never select a banned model.
- [ ] Validate JSON, enforce 8-second aborts and bounded retries; use deterministic fallback on malformed, empty or unavailable results. Seed never calls Granite.
- [ ] Check `sk_test_` before any Stripe call. Create only test customers/payment methods, use stable idempotency keys, and distinguish explicit card declines from configuration/network failures.
- [ ] Test adapters with fakes: missing credentials, timeout, malformed response, decline, retry, duplicate close and reset during an in-flight operation. An uncertain payment must not be silently retried as another live charge.
- [ ] Run sandbox integrations only when configured, separately from deterministic tests. Record mock versus external execution accurately.

## Task 7 — Final contract verification and handoff

**Files:** create `backend/tests/demo.test.ts`; update `.hackathon/STATE.md`, `docs/FRONTEND_HANDOFF.md`.

- [ ] Run `npm test` and `npm run build` from backend.
- [ ] Exercise all published response shapes and negative cases through HTTP. Validate legacy exchange/pooling/warehouse flows still work.
- [ ] Repeat the complete demo from reset; verify order merge, viewer privacy, real savings arithmetic, accepted waste and stored invoices.
- [ ] Update STATE with actual commit/environment/scenario/results. Keep browser rehearsal separate from API verification.

## Frontend consequence

The Next.js UI still calls the legacy APIs. Backend completion alone will not show the new demo: persona header, order form/results, scrap inbox, operator close and metrics must subsequently consume the new endpoints. Use existing UI components and the published contracts; do not retrofit the old `/order-pools` entity into the new `/pools` model.
