# §11 Implementation Plan — SupplyMash backend (2 hrs, 2 devs)

Status: **DRAFT — pending team review.**  
Spec: `docs/superpowers/specs/2026-11-13-supplymash-order-first-design.md`  
Existing backend: `backend/src/`

---

## Conflicts / gaps between the spec and existing code

| # | Issue | Location | Resolution |
|---|---|---|---|
| 1 | `Business` has no `usualSupplierIds` or `stripeCustomerId` fields | `types/index.ts` | Dev A adds them in Phase 0 types work |
| 2 | `Location` has `lat?` and `lng?` as optional; spec requires them non-optional in seed | `types/index.ts` | Keep optional in the type (not all old data has them). Seed always provides values. Document the invariant. |
| 3 | `ResourceListing` has no `status: 'proposed'` and no `source` or `orderId` fields | `types/index.ts` | Dev A extends `ListingStatus` and adds optional fields in Phase 0 |
| 4 | `Match` has no `direction` or `suggestedPricePerUnit` fields | `types/index.ts` | Dev A adds optional fields in Phase 0 |
| 5 | `triggerMatching` in `controllers/matches.ts` queries `active` listings without filtering out `proposed` ones | `controllers/matches.ts` | The spec says `triggerMatching` must skip `proposed` listings. Dev B adds a one-line guard when implementing `scrap.ts`. |
| 6 | `getListings` in `controllers/listings.ts` returns `proposed` listings to callers because it only excludes by status when `status` query param is absent (defaults to `active`) — but `proposed` is not `active` so it is already excluded. | `controllers/listings.ts` | No change needed; the new status is not `active` so legacy filter already hides it. |
| 7 | `getMatches` in `controllers/matches.ts` returns all matches including `ask_holder` direction ones. The spec says the Dashboard graph data should exclude unaccepted inferred matches. | `controllers/matches.ts` | Dev B adds `direction` filter: `GET /api/matches` excludes `ask_holder` matches with `status !== 'accepted'` |
| 8 | `OrderPool` (old type) uses `status: 'open' \| 'forming' \| 'confirmed' \| 'delivered'` — the new `Pool` uses `'open' \| 'closed'`. These are different entities on different collections; there is no naming clash, but `PoolStatus` will need a new type. | `types/index.ts` | Dev A creates a new `Pool` type (spec §6) alongside the old `OrderPool`. Old routes are untouched. |
| 9 | `store.ts` has no `suppliers`, `orders`, `pools` collections | `models/store.ts` | Dev B adds them to `db` in Phase 0 / seed work |
| 10 | `index.ts` does not mount the new routes | `index.ts` | Dev A mounts them in Phase 0 route-stub step |

---

## Overview

Work is split across **5 phases** that map to the §11 time-box. Each phase has a Dev A task and a Dev B task that run in parallel. A phase is complete only when **both** tasks are done.

The rule from the spec applies throughout: **fallback first, Granite/Stripe second.** At no point should a step be blocked on an external service.

---

## Phase 0 — Stubs + types + seed (0:00–0:15)

### Dev A — Types and route stubs

**Intent:** Publish a compilable API surface so the frontend can start immediately. No business logic yet — handlers return seed-shaped hard-coded or empty responses.

**Expected outcomes:**
- `backend/src/types/index.ts` has all new interfaces and extended fields (conflicts #1 #3 #4 #8 above).
- New route files exist: `routes/suppliers.ts`, `routes/orders.ts`, `routes/pools.ts`, `routes/scrapOffers.ts`, `routes/demo.ts`.
- New controller stubs: each handler responds `200` with an empty array or a fixed object matching the spec shape; `POST /api/orders` returns a stub `201`.
- `index.ts` mounts all new routers.
- Server starts and `GET /api/health` still returns `ok`.

**Todo:**
- [ ] In `types/index.ts`: add `Supplier`, `CatalogItem`, `Order`, `OrderLine`, `Pool`, `PurchaseOrder`, `Invoice`, `PoolView`, `PoolOperatorView`, `ScrapOffer`, `Metrics` interfaces
- [ ] Extend `Business` with `stripeCustomerId?: string` and `usualSupplierIds: string[]`
- [ ] Extend `ResourceListing` with `status: 'proposed'` added to `ListingStatus`, and optional `source?: 'inferred_from_order'` and `orderId?: string`
- [ ] Extend `Match` with optional `direction?: 'ask_holder'` and `suggestedPricePerUnit?: number`
- [ ] Create stub controller files: `controllers/suppliers.ts`, `controllers/orders.ts`, `controllers/pools.ts`, `controllers/scrapOffers.ts`, `controllers/demo.ts`
- [ ] Create route files that wire stubs: `routes/suppliers.ts`, `routes/orders.ts`, `routes/pools.ts`, `routes/scrapOffers.ts`, `routes/demo.ts`
- [ ] Mount all five new routers in `index.ts`
- [ ] `tsc --noEmit` passes (or `npm run dev` starts) — confirm no type errors

**Relevant context:**
- [`backend/src/types/index.ts`](../../../backend/src/types/index.ts) — extend, do not replace
- [`backend/src/index.ts`](../../../backend/src/index.ts) — add five `app.use()` lines
- Spec §6 (data model), §9 (API contract response shapes)

**Status:** [ ] pending

---

### Dev B — Seed data, `GET /api/suppliers`, `POST /api/demo/reset`

**Intent:** Populate `store.ts` with realistic fictional data so stubs return something meaningful and the demo scenario is baked in from the start.

**Expected outcomes:**
- `db` gains `suppliers: Supplier[]`, `orders: Order[]`, `pools: Pool[]` collections.
- 3 suppliers seeded with catalogs (Detroit supply co, GR lumber yard, Lansing farm-supply).
- ~10 businesses seeded (3 Detroit cafés, GR furniture maker, Detroit contractor, 2 farms, 3 existing kept). All have `lat`, `lng`, `usualSupplierIds`.
- One open pool at the Detroit supplier containing 2 pre-parsed orders (pool at ~75% of free-delivery threshold).
- 2 active `requesting` listings for wood offcuts/chips (farms, within 60 mi of GR lumber yard).
- `GET /api/suppliers` returns `Supplier[]` with catalogs.
- `POST /api/demo/reset` wipes `suppliers`, `orders`, `pools`, `listings`, `matches` back to seed state (idempotent).

**Todo:**
- [ ] Add `suppliers`, `orders`, `pools` arrays to `db` in `store.ts`
- [ ] Write seed function `seedDatabase()` covering all 3 suppliers with catalogs (4–6 SKUs each, 1–2 bulk tiers, delivery fee, free-delivery minimum)
- [ ] Seed ~10 businesses with `lat/lng` and `usualSupplierIds`; keep existing 3 businesses
- [ ] Seed one open pool for Detroit supplier with 2 pre-parsed orders; verify pool subtotal is ~75% of `freeDeliveryMinimum` so the live café order crosses it
- [ ] Seed 2 `requesting` listings in `wood_lumber` category from Kent and Washtenaw county farms
- [ ] Implement `getSuppliers` controller (returns `db.suppliers`)
- [ ] Implement `resetDemo` controller: calls `seedDatabase()` and returns `{ ok: true }`
- [ ] Confirm `GET /api/businesses` still works with the expanded business list

**Relevant context:**
- [`backend/src/models/store.ts`](../../../backend/src/models/store.ts) — add collections and replace seed inline code with `seedDatabase()` called once at startup
- Spec §10 (seed data ranges and scenario requirements)
- Spec §4 (decisions): one open pool per supplier; seeded orders are pre-parsed, not calling Granite

**Status:** [ ] pending

---

## Phase 1 — Pricing + pools and Parser + writer (0:15–0:55)

### Dev A — `pricing.ts` and `pools.ts` join/create/view

**Intent:** Implement the deterministic pooling math and pool lifecycle. These are pure TypeScript with no external dependencies — the safest part of the system to do first after the types are in place.

**Expected outcomes:**
- `services/pricing.ts` correctly computes `soloCost`, `pooledCost`, `savings`, `progressPct`, `nextMilestone` for the seeded numbers.
- `services/pools.ts` can find-or-create a pool for a supplier, attach an order, recalculate all orders in the pool, and produce `PoolView` (viewer-safe) and `PoolOperatorView`.
- `GET /api/pools` and `GET /api/pools/:id` return the correct view based on presence of `X-Business-Id` header.
- The seeded pool at 75% progresses to >100% when a third café order is added (confirmed manually or in a quick inline test).

**Todo:**
- [ ] Create `services/pricing.ts` with `soloOrderCost(order, supplier)`, `pooledOrderCost(order, pool, supplier)`, `computeAllSavings(pool, suppliers)`, `buildPoolView(pool, businessId?, suppliers, orders)`, `buildOperatorView(pool, suppliers, orders, businesses)`
- [ ] Create `services/pools.ts` with `findOrCreatePool(supplierId)`, `attachOrder(pool, order)`, `recalculatePool(pool)` (calls pricing), `closePool(pool)` stub (fully implemented in Phase 2)
- [ ] Update `controllers/pools.ts` stub to call real service for `GET /api/pools` and `GET /api/pools/:id`
- [ ] Manually verify (console.log or inline assertions) that café order #3 pushes the Detroit pool past the free-delivery threshold using seed numbers from Dev B

**Relevant context:**
- Spec §7 (pricing rules, exact formulas for delivery proration and bulk tiers)
- Spec §9 (`PoolView`, `PoolOperatorView` shapes)
- `services/` directory does not yet exist — create it

**Status:** [ ] pending

---

### Dev B — `parser.ts` and `writer.ts` (fallback first, Granite second)

**Intent:** Parse free-text orders into structured line items and produce human-readable text for scrap offers and pool emails. Fallback implementations ship first so the full order flow works without Granite.

**Expected outcomes:**
- `services/parser.ts` alias/keyword fallback maps common words to catalog SKUs using the `aliases` field on `CatalogItem`. Returns `ParseResult` with `lines` and `parsedBy: 'fallback'`.
- `services/writer.ts` template functions return hard-coded strings for `aiReasoning`, `offerText`, and `poEmailText`.
- Granite integration added behind a flag: `parser` calls watsonx.ai with 8 s timeout; on failure uses fallback. Sets `parsedBy: 'granite'`.
- `services/writer.ts` Granite path: calls watsonx.ai for reasoning and email text; falls back to templates.
- Granite model: a current, non-banned Granite chat model in the Dallas region (e.g. `ibm/granite-3-3-8b-instruct`). Store in `WATSONX_MODEL_ID` env var with a safe default.

**Todo:**
- [ ] Create `services/parser.ts` with `parse(rawText, catalog)` — alias + keyword fallback (normalize to lowercase, split tokens, match against `item.aliases` and `item.name`)
- [ ] Create `services/writer.ts` with `scrapReason(offer, requester, holder)`, `scrapOfferText(...)`, `poEmailText(po, supplier)` — template strings for all three
- [ ] Wire up `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`, `WATSONX_MODEL_ID` from `backend/.env` (do not crash if absent)
- [ ] Add Granite path to `parser.ts`: call watsonx.ai chat endpoint with a prompt asking for `[{sku, qty}]` JSON. Validate result; fall back on timeout >8 s, bad JSON, empty array, or SKU not in catalog.
- [ ] Add Granite path to `writer.ts` for the three text outputs; fall back to templates on any error.
- [ ] Add `WATSONX_API_KEY=`, `WATSONX_PROJECT_ID=`, `WATSONX_URL=`, `WATSONX_MODEL_ID=` to `backend/.env.example`

**Relevant context:**
- Spec §8 workflow A step 2 (parser contract, fallback rules)
- Spec §4 decisions: Granite for narrow jobs, always returning checked JSON
- Spec §13 (Granite fallback: `parsedBy` field shows which ran)
- `@ibm-cloud/watsonx-ai` npm package (install in backend)

**Status:** [ ] pending

---

## Phase 2 — Close pool + payments and Scrap + scrap-offers (0:55–1:30)

### Dev A — `POST /api/pools/:id/close` and `payments.ts`

**Intent:** Implement the pool-close workflow: final pricing, PO generation, charging each business, handling card declines, and setting statuses. Mock payments first, Stripe second.

**Expected outcomes:**
- `POST /api/pools/:id/close` returns `{ purchaseOrder, invoices }` with correct math.
- Without `STRIPE_SECRET_KEY`: all invoices have `status: 'mock_succeeded'`. Demo completes normally.
- With `sk_test_*` key: Stripe `PaymentIntent` confirmed for each business; real `stripePaymentIntentId` on each invoice.
- Card declines (Stripe decline test card): declined orders dropped, pricing recalculated once, remaining orders re-charged at the new (higher) amount.
- Server refuses to start if the key is present but does not start with `sk_test_`.

**Todo:**
- [ ] Create `services/payments.ts` with `mockCharge(business, amountUsd)` → `Invoice` with `status: 'mock_succeeded'`
- [ ] Add `STRIPE_SECRET_KEY=` to `backend/.env.example`; install `stripe` npm package
- [ ] Add Stripe path to `payments.ts`: create customers at startup for seeded businesses with `pm_card_visa`; `charge(business, amountUsd)` → confirmed PaymentIntent
- [ ] Add startup guard: if `STRIPE_SECRET_KEY` is set and doesn't start with `sk_test_`, log error and `process.exit(1)`
- [ ] Implement `services/pools.ts closePool(pool)`: final pricing → build `PurchaseOrder` → charge each order (mock or real) → handle declines (drop, reprice, recharge delta) → set statuses → call `writer.poEmailText`
- [ ] Update `controllers/pools.ts` to call real `closePool` for `POST /api/pools/:id/close`

**Relevant context:**
- Spec §8 workflow C (close) and D (payments, card decline logic)
- Spec §4: "charge before PO with declines dropped"
- `stripe` npm package; test payment method `pm_card_visa`

**Status:** [ ] pending

---

### Dev B — `scrap.ts`, `GET /api/scrap-offers`, and match respond guard

**Intent:** Implement scrap inference from an order, match inferred byproducts to active requesting listings nearby, and expose the per-business scrap-offer inbox. Guard the `respond` endpoint so only the holder can decide on `ask_holder` matches.

**Expected outcomes:**
- `POST /api/orders` triggers `inferAndOffer(order)` which creates `proposed` offering listings and `ask_holder` matches for nearby requesters.
- `GET /api/scrap-offers` with `X-Business-Id` returns `ScrapOffer[]` for that business (as holder or requester).
- `PUT /api/matches/:id/respond` returns 403 when the caller is not the holder for an `ask_holder` match.
- `GET /api/matches` excludes unaccepted `ask_holder` matches (conflict #7 fix).
- `triggerMatching` skips listings with `source: 'inferred_from_order'` and `status: 'proposed'` (conflict #5 fix).
- Decline: inferred listing → `expired`; accept: both listings → `matched`, match visible everywhere.

**Todo:**
- [ ] Create `services/scrap.ts` with `inferAndOffer(order, catalog, listings, businesses)`:
  - Fallback byproduct map: `lumber` → `wood_lumber` offcuts at 10% of board-feet
  - Find nearest active `requesting` listing in the same `materialCategory` within 60 mi (straight-line using lat/lng haversine; a small utility function)
  - Create `proposed` offering `ResourceListing` with `source: 'inferred_from_order'` and `orderId`
  - Create `Match` with `direction: 'ask_holder'` and `suggestedPricePerUnit` (80% of requester's `pricePerUnit`)
  - Call `writer.scrapReason(...)` for `aiReasoning`
  - Granite path: call watsonx.ai with order lines → `[{materialCategory, title, estQty, unit, readyInDays}]`; validate; fall back to map on error
- [ ] Update `POST /api/orders` stub controller to call `parser → pricing/pools → inferAndOffer` and return the full spec §8 workflow A response
- [ ] Implement `GET /api/scrap-offers` controller: filter matches where caller is holder or requester; map to `ScrapOffer` shape (anonymous until accepted)
- [ ] Update `respondToMatch` in `controllers/matches.ts`: add `ask_holder` direction guard (403 if `X-Business-Id` ≠ holder's business ID); on decline set inferred listing to `expired`
- [ ] Update `getMatches` in `controllers/matches.ts`: filter out `ask_holder` matches where `status !== 'accepted'`
- [ ] Update `triggerMatching` to skip listings with `source === 'inferred_from_order'`

**Relevant context:**
- Spec §6 (privacy rule, proposed listing behavior)
- Spec §8 workflow B (respond guard)
- [`backend/src/controllers/matches.ts`](../../../backend/src/controllers/matches.ts) — extend existing `respondToMatch` and `getMatches`
- Haversine formula for distance (small utility, no npm package needed)

**Status:** [ ] pending

---

## Phase 3 — Metrics + frontend integration and Full demo path (1:30–1:45)

### Dev A — `metrics.ts` and frontend integration

**Intent:** Compute platform-wide totals and confirm the frontend can render all new API responses.

**Expected outcomes:**
- `GET /api/metrics` returns a `Metrics` object with correct figures traceable to seed data.
- Frontend "place order" flow, pool progress bar, scrap offer inbox, operator close view, and metrics strip all render without console errors against the real API.

**Todo:**
- [ ] Create `services/metrics.ts` with `computeMetrics(db)`:
  - `dollarsSavedClosed`: Σ invoice savings from closed pools
  - `dollarsSavedProjected`: Σ estimated savings from open pools
  - `deliveriesAvoided`: Σ `(orderCount - 1)` for each closed pool
  - `lbsDiverted`: Σ accepted scrap `estQty` converted to lbs using `weightLbsPerUnit` where available, else a fixed factor per category
  - `dollarsKeptInMichigan`: Σ closed-pool PO totals with `michiganBased` suppliers + Σ accepted scrap value (qty × `suggestedPricePerUnit`)
- [ ] Update `controllers/metrics.ts` stub to call `computeMetrics`
- [ ] Coordinate with frontend team: confirm `X-Business-Id` header is set by the persona switcher and that the `parsedBy` label renders on each AI-written string

**Relevant context:**
- Spec §9 (`Metrics` interface)
- Spec §2 goal 5 (platform totals)

**Status:** [ ] pending

---

### Dev B — End-to-end demo path smoke test and fixes

**Intent:** Walk the full demo script against the real running backend and patch any broken joins between services.

**Expected outcomes:**
- Demo script runs top-to-bottom without manual intervention.
- `POST /api/demo/reset` reliably resets to seed state.
- All five demo moments from spec §1 and BRIEF.md work: café order parses, pool crosses free delivery, furniture maker triggers scrap offer to farm, operator closes pool, metrics update.

**Todo:**
- [ ] Run `POST /api/demo/reset`; confirm seed state via `GET /api/suppliers`, `GET /api/pools`, `GET /api/metrics`
- [ ] Submit café order (business = Detroit café #3, text = intentionally messy); verify `parsedBy`, pool progress >100%, `yourSavings > 0`
- [ ] Submit furniture-maker lumber order; verify `scrapOffers` has ≥1 pending offer to Kent County farm
- [ ] Accept the scrap offer as the furniture maker; verify listing becomes `matched`
- [ ] Operator view: `GET /api/pools/:id` without header; verify full `PoolOperatorView` with business names and lines
- [ ] `POST /api/pools/:id/close`; verify `purchaseOrder.emailText` present and all invoices `succeeded` or `mock_succeeded`
- [ ] `GET /api/metrics`; verify `deliveriesAvoided ≥ 2`, `lbsDiverted > 0`, `dollarsKeptInMichigan > 0`
- [ ] Fix any bugs found; re-run from reset

**Status:** [ ] pending

---

## Phase 4 — Freeze and rehearsal (1:45–2:00)

Both devs: run the full demo path twice from `POST /api/demo/reset`. Record results (commit SHA, environment, all five demo moments confirmed/failed) in `.hackathon/STATE.md`. No new code after 1:45.

**Status:** [ ] pending

---

## File map — new files to create

```
backend/src/
├── services/
│   ├── pricing.ts       Dev A Phase 1
│   ├── pools.ts         Dev A Phase 1 + 2
│   ├── parser.ts        Dev B Phase 1
│   ├── writer.ts        Dev B Phase 1
│   ├── payments.ts      Dev A Phase 2
│   ├── scrap.ts         Dev B Phase 2
│   └── metrics.ts       Dev A Phase 3
├── controllers/
│   ├── suppliers.ts     Dev A Phase 0 (stub → Dev B real in Phase 0)
│   ├── orders.ts        Dev A Phase 0 stub → Dev B real in Phase 2
│   ├── pools.ts         Dev A Phase 0 stub → real in Phase 1+2
│   ├── scrapOffers.ts   Dev B Phase 2
│   ├── demo.ts          Dev B Phase 0
│   └── metrics.ts       Dev A Phase 3
└── routes/
    ├── suppliers.ts     Dev A Phase 0
    ├── orders.ts        Dev A Phase 0
    ├── pools.ts         Dev A Phase 0
    ├── scrapOffers.ts   Dev A Phase 0
    └── demo.ts          Dev A Phase 0
```

## Files modified (not replaced)

| File | Who | When | Change |
|---|---|---|---|
| `types/index.ts` | Dev A | Phase 0 | Add new interfaces and extend existing ones |
| `models/store.ts` | Dev B | Phase 0 | Add collections; replace inline seed with `seedDatabase()` |
| `index.ts` | Dev A | Phase 0 | Mount 5 new routers |
| `controllers/matches.ts` | Dev B | Phase 2 | Guard `respondToMatch`; filter `getMatches`; fix `triggerMatching` |
