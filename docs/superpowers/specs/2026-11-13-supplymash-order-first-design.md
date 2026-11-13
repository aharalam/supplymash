# SupplyMash: order-first design (hackathon MVP scope)

Status: **APPROVED by the team, 2026-11-13.** Nothing in here is built yet.
Date: 2026-11-13. Event: Michigan DevFest Hackathon 2026 (IBM). Competition facts are in `.hackathon/BRIEF.md`.

## 1. Intent

Small Michigan businesses each buy alone. They pay full unit prices and a delivery fee on every order, and they throw away byproducts that a neighbor would pay for.

SupplyMash is **where businesses place their normal supply orders**. They name the supplier they already use, and SupplyMash quietly finds the savings:

- **Pooling.** Other nearby orders to the same supplier are combined:
  - Same product → one bulk order at a better price tier.
  - Different products → one shipment, so the delivery fee shrinks or disappears.
- **Inferred scrap exchange.** From what a business buys, SupplyMash infers what scrap it will produce. A lumber order implies offcuts. SupplyMash then asks that business whether it will sell the scrap cheaply to a nearby business that has asked for it.

SupplyMash does **not** deliver anything. It is the ordering and matching layer. It is the **buyer of record**: the supplier invoices SupplyMash once, and SupplyMash bills each business its own share.

### Why this beats the existing repo's MVP
The repo's MVP is a listings board: businesses post scrap or needs and press "run matching." Most waste marketplaces die because nobody lists their scrap. Order-first removes that step: the order *is* the signal. This is the core of the "Creativity and innovation" score.

## 2. Goals, non-goals, anti-goals

**Goals (the demo must show each one working end to end)**
1. A business places an order in messy free text, naming its usual supplier. Granite turns the text into priced line items.
2. The order joins an open pool for that supplier. The business sees anonymous progress and its own estimated savings.
3. Granite infers the scrap the order will produce. If a nearby business has requested that material, the orderer gets an offer it can accept or decline. The offer includes a Granite-written reason and a suggested price.
4. A pool closes. SupplyMash produces one combined purchase order for the supplier, with Granite-drafted email text. Each business gets its own invoice, charged through Stripe test mode.
5. Platform totals: dollars saved, deliveries avoided, pounds of waste diverted, and dollars kept with Michigan suppliers.

**Non-goals (the 2-hour backend will not build these)**
- Real payments, logins and accounts, delivery or logistics, a supplier portal.
- Supplier payouts through Stripe Connect.
- Real-time notifications.
- AI matching for warehouses. The existing warehouse pages stay as they are and are pitched as the next feature.

**Anti-goals (failure even if the code works)**
- A business can see who else is in its pool or what they ordered. Pools are anonymous; see §6.
- Savings numbers the team cannot explain line by line. Every figure must trace back to the seeded supplier price list.
- The live demo depends on Granite or Stripe being up. Both need working fallbacks.
- Real card data or personal information anywhere. The hackathon rules forbid it.

## 3. Constraints

- **Time and people:** 2 hours of backend work by 2 backend developers. 2 frontend developers are waiting on the API.
- **IBM Bob IDE** must be visibly central. Write the backend code in Bob, and every member saves a usage PNG in `bob_usage/`.
- **Existing stack is kept:** Node.js, Express, TypeScript, in-memory store, React 19, Vite, Tailwind. **Do not switch languages.**
- **Existing endpoints stay compatible.** The current pages (`Dashboard`, `RecyclingExchange`, `OrderPooling`, `Warehouses`, `Register`) must keep working. New behavior is **added** alongside them.
- **Banned watsonx models:** llama-3-405b-instruct, mistral-medium-2505, mistral-small-3-1-24b-instruct-2503.
- **Secrets** live only in `backend/.env`, which is gitignored. Leaked IBM keys get the account suspended.
- **Data:** all businesses and suppliers are fictional. Real Michigan towns and industries are allowed.

## 4. Decisions

### Team decisions
- Businesses submit orders on SupplyMash and **name their usual supplier**.
- Same supplier and same product → combined bulk order. Same supplier and different products → combined shipment.
- SupplyMash is **buyer of record**. The supplier invoices SupplyMash, which re-invoices each business. Each business keeps a payment method on file.
- **Stripe sandbox** (test mode) for payments.
- **Granite** parses messy order text.
- **Open pools** have a deadline.
- **Businesses stay unaware of each other.**
- Scrap is **inferred from purchases**, and the scrap holder is asked whether to sell to the requester at a low price.
- Warehouses are run by businesses with spare space.
- The frontend team builds the UI; this document fixes the API.

### Claude's calls (the team can override)
- **Primary track: Reinvigorating Main Street.** Manufacturing and sustainability are secondary story points.
- **The requester picks up scrap.** SupplyMash only brokers the deal.
- **Scrap price rule.** The requester's posted `pricePerUnit` is the maximum it will pay. Granite suggests a price at or below it, defaulting to 80% of the maximum.
- **Pools close manually in the demo** (`POST /close`). The deadline is shown but not enforced by a timer.
- **One open pool per supplier at a time.** An order to a supplier with no open pool creates one with a 3-day deadline.
- **Viewer identity comes from an `X-Business-Id` header**, set by a persona switcher in the UI. There are no logins.
- **Granite is used for three narrow jobs, always returning checked JSON:** parsing orders, inferring scrap, and writing the explanation, offer and email text. Matching, pricing and pooling are plain TypeScript, so they are deterministic and easy to explain.
- **Google Cloud is used in the frontend only:** Google Maps JavaScript API for the business map, if the frontend team has time. The backend stores lat/lng and uses straight-line distance, with no live Google calls. The existing Three.js network graph is an acceptable alternative visual.
- **The store stays in memory**, with `POST /api/demo/reset` to reseed. Cloudant is a stretch goal.
- **The old pages stay** as a backup demo and for warehouses. The new design replaces the old MVP's *story*, not its code.
- **Business-to-business decisions after the builder check:** inferred scrap hidden until accepted, one merged order per business per pool, `usualSupplierIds`, charge before PO with declines dropped, and holder-only responses to scrap offers.

## 5. Architecture

```
React SPA (existing, 2 FE devs)
  persona switcher → X-Business-Id header
      │  /api/*
      ▼
Express API (existing, extended)
  routes/controllers ──► services/
                          ├── parser.ts      Granite: text → line items   (fallback: alias match)
                          ├── pricing.ts     solo vs pooled cost, tiers, delivery
                          ├── pools.ts       join/create pool, close → PO + invoices
                          ├── scrap.ts       Granite: line items → byproducts → match requests
                          ├── writer.ts      Granite: reasons, offer text, PO email (fallback: templates)
                          ├── payments.ts    Stripe test mode (fallback: mock charge)
                          └── metrics.ts     platform totals
                          │
                 models/store.ts (in-memory + seed)
                          │
        ┌─────────────────┼──────────────────┐
   watsonx.ai          Stripe API         (stretch) watsonx Orchestrate
   Granite chat        test mode          agent using this API as tools
```

## 6. Data model (additions to `backend/src/types`)

```ts
interface Supplier {
  id: string; name: string; location: Location;      // lat/lng required in seed
  michiganBased: boolean;
  deliveryFee: number;                               // per shipment
  freeDeliveryMinimum: number;                       // shipment subtotal for free delivery
  catalog: CatalogItem[];
}
interface CatalogItem {
  sku: string; name: string; aliases: string[];      // aliases drive the fallback parser
  category: string;                                  // e.g. 'paper_goods', 'lumber'
  unit: string; unitPrice: number;
  bulkTiers: { minQty: number; unitPrice: number }[]; // based on the pool's combined qty for this sku
  weightLbsPerUnit?: number;
}
interface Order {
  id: string; businessId: string; supplierId: string;
  rawText: string;
  lines: OrderLine[];
  poolId: string;
  parsedBy: 'granite' | 'fallback';
  status: 'pooled' | 'invoiced';
  createdAt: string;
}
interface OrderLine { sku: string; name: string; qty: number; unit: string; soloUnitPrice: number; }
interface Pool {                                     // new; the existing OrderPool stays for old pages
  id: string; supplierId: string; orderIds: string[];
  deadline: string; status: 'open' | 'closed';
  purchaseOrder?: PurchaseOrder; invoices?: Invoice[];
}
interface PurchaseOrder {
  supplierId: string;
  lines: { sku: string; name: string; qty: number; unitPrice: number }[];
  subtotal: number; deliveryFee: number; total: number;
  emailText: string;
}
interface Invoice {
  businessId: string; orderId: string;
  soloCost: number; pooledCost: number; savings: number;
  stripePaymentIntentId?: string;
  status: 'succeeded' | 'mock_succeeded' | 'failed';
}
```

**Scrap reuses the existing types,** so `RecyclingExchange` keeps working:
- An inferred byproduct becomes a `ResourceListing` with `type: 'offering'`, a new status `'proposed'`, and a new optional field `source: 'inferred_from_order'` plus `orderId`.
- **Proposed listings and `ask_holder` matches are hidden from the legacy endpoints.** `GET /api/listings`, `GET /api/matches` and the Dashboard graph data exclude them while pending, and `triggerMatching` skips any listing that isn't `active`. This is the only change to legacy controllers.
- On **accept**, the listing becomes `matched` and the match becomes visible everywhere, with real names. On **decline**, the listing becomes `expired` and the match stays hidden.
- The offer becomes a `Match` with a new optional `direction: 'ask_holder'` and `suggestedPricePerUnit`. The existing `respond` endpoint accepts or declines it.

Business gains `stripeCustomerId?` and `usualSupplierIds: string[]` (seeded; the order form preselects the first one). It also requires `location.lat/lng` in the seed.

### Privacy rule
Any response for a viewer (`X-Business-Id` set) about a pool contains only:
- `memberCount`
- `progress` toward the next threshold
- the deadline
- the viewer's **own** order, savings and invoice

Never other business IDs, names or lines. With no header, the response is the operator/supplier view, used for the "close pool" moment. The legacy `/api/order-pools` endpoints are untouched.

## 7. Pricing rules (`pricing.ts`)

- **Solo cost** of an order = Σ qty × base `unitPrice`, plus `deliveryFee` unless the solo subtotal ≥ `freeDeliveryMinimum`.
- **Pooled cost**:
  - Each line is priced at the best `bulkTier` reached by the **pool's combined qty for that sku**. If no tier is reached, the base price applies.
  - Delivery is one shipment. If the pool subtotal ≥ `freeDeliveryMinimum`, the fee is 0. Otherwise the business pays `deliveryFee` × (its order subtotal ÷ pool subtotal).
- **Savings** = solo cost − pooled cost, never below 0. Round to cents.
- **Progress**: the pool subtotal as a percentage of `freeDeliveryMinimum`, capped at 100. Also return `nextMilestone`, the next unreached tier or free delivery, with the amount still needed.
- Savings are recalculated for every order in the pool whenever an order joins. At close, they become final.

Stated assumption, for the pitch: the supplier honors tier pricing on the combined order and delivers it as one route or one drop. A shared micro-warehouse drop point is the roadmap answer for businesses that are far apart.

## 8. Workflows

**A. Place an order:** `POST /api/orders`
1. Validate that the business and supplier exist.
2. `parser.parse(rawText, supplier.catalog)`. Granite gets the catalog names, SKUs and units and returns `[{sku, qty}]` JSON.
   - Validate: the SKU is in the catalog and qty > 0.
   - On a timeout of more than 8 s, invalid JSON or an empty result, fall back to the alias and keyword matcher.
   - If both fail, return 422 with a readable message.
3. Find or create the open `Pool` for the supplier, attach the order, and recalculate pricing. **If this business already has an order in that open pool, merge the new lines into the existing order** (same SKU → add the quantities) and return that order. There is one order per business per pool, so `memberCount` = businesses = orders.
4. `scrap.inferAndOffer(order)`:
   - Granite returns likely byproducts as `[{materialCategory, title, estQty, unit, readyInDays}]`. Fallback: a fixed map, for example lumber → `wood_lumber` offcuts at 10% of the ordered board-feet.
   - For each byproduct, find active `requesting` listings in the same `materialCategory`, from a different business, within 60 miles. Use the nearest one.
   - Create an inferred offering listing and a `Match` (`direction: 'ask_holder'`).
   - `writer` produces `aiReasoning`, using a template if Granite is unavailable.
5. Respond with the order, the viewer-safe pool view, the scrap offers and `parsedBy`.

**B. Respond to a scrap offer:** existing `PUT /api/matches/:id/respond`.
- For `ask_holder` matches, **only the holder decides**: `X-Business-Id` must equal the holder's business ID, otherwise 403. The requester sees the offer and its status, with no buttons.
- Accepting sets both listings to `matched` (current behavior). Declining sets the inferred listing to `expired`.
- Metrics count accepted matches.
- Legacy matches keep their current, unchecked behavior.

**C. Close a pool:** `POST /api/pools/:id/close`, operator view
1. Final pricing.
2. Build the `PurchaseOrder`; `writer` drafts `emailText`.
3. For each order, create an `Invoice` and call `payments.charge(business, pooledCost)`.
4. Set the pool to `closed` and the orders to `invoiced`.
5. Return the PO and the invoices.

**D. Payments** (`payments.ts`)
- When `STRIPE_SECRET_KEY` (test key, `sk_test_…`) is present:
  - At startup, create a Stripe customer for each seeded business with the test payment method `pm_card_visa`.
  - At close, charge each business with a confirmed off-session PaymentIntent in USD cents.
- Without the key, or on a Stripe configuration or network error: `mock_succeeded`. Log it, never crash.
- A **card decline** sets the invoice to `failed`. Close charges every order **before** building the PO. Declined orders are removed from the pool, pricing is recalculated once, and the remaining orders are charged the difference (the recalculated amount can only be equal or higher, so charge or record only the delta). Then the PO is built from the remaining orders. In the demo this only happens if someone uses a Stripe decline test card; it matches the pitch line "cards are charged before the supplier is paid".
- **Refuse to start with a key that does not begin with `sk_test_`.**

**E. Demo reset:** `POST /api/demo/reset` reseeds everything. It is idempotent and safe to press between rehearsals.

## 9. API contract

The frontend builds against this **now**. Phase 0 (§11) ships stub handlers that return seed-shaped data, so the frontend is never blocked. All money is a USD number in dollars with 2 decimals, and dates are ISO strings.

| Method & path | Request | Response |
|---|---|---|
| `GET /api/suppliers` | none | `Supplier[]` (catalog included) |
| `POST /api/orders` | `{ businessId, supplierId, text }` | `201 { order: Order, pool: PoolView, scrapOffers: ScrapOffer[], parsedBy }` / `422 { error }` |
| `GET /api/orders` | header `X-Business-Id` | `Order[]` for that business, each with `pool: PoolView` |
| `GET /api/pools` | optional header | Without header: `PoolOperatorView[]`. With header: `PoolView[]` for pools the viewer is in, plus open pools for its `usualSupplierIds` |
| `GET /api/pools/:id` | optional header | `PoolView` or `PoolOperatorView` |
| `POST /api/pools/:id/close` | none | `{ purchaseOrder: PurchaseOrder, invoices: Invoice[] }` |
| `GET /api/scrap-offers` | header `X-Business-Id` | `ScrapOffer[]` where the viewer is the holder or the requester |
| `PUT /api/matches/:id/respond` | `{ status: 'accepted' \| 'declined' }` | `Match` (existing) |
| `GET /api/metrics` | none | `Metrics` |
| `POST /api/demo/reset` | none | `{ ok: true }` |
| existing `/api/businesses`, `/api/listings`, `/api/order-pools`, `/api/warehouses`, `/api/matches` | unchanged | unchanged |

```ts
interface PoolView {            // viewer-safe
  id: string; supplierName: string; deadline: string; status: 'open' | 'closed';
  memberCount: number;          // includes the viewer
  progressPct: number;
  nextMilestone: { label: string; amountNeeded: number } | null;
  yourOrderId?: string; yourSoloCost?: number; yourPooledCost?: number; yourSavings?: number;
  yourInvoice?: Invoice;
}
interface PoolOperatorView extends Omit<PoolView, 'yourOrderId' | 'yourSoloCost' | 'yourPooledCost' | 'yourSavings' | 'yourInvoice'> {
  orders: { businessName: string; lines: OrderLine[]; soloCost: number; pooledCost: number }[];
  subtotal: number; purchaseOrder?: PurchaseOrder; invoices?: Invoice[];
}
interface ScrapOffer {
  matchId: string; role: 'holder' | 'requester';
  material: string; estQty: number; unit: string; readyInDays: number;
  suggestedPricePerUnit: number;
  counterpartyLabel: string;    // anonymous until accepted, e.g. "A farm 14 mi away"; real name after
  distanceMiles: number;
  aiReasoning: string;
  status: 'pending' | 'accepted' | 'declined';
}
interface Metrics {
  dollarsSaved: number;              // Σ invoice savings (closed pools) + Σ current estimates (open pools), reported separately:
  dollarsSavedClosed: number; dollarsSavedProjected: number;
  deliveriesAvoided: number;         // Σ over closed pools of (orders − 1)
  lbsDiverted: number;               // Σ accepted scrap estQty converted to lbs
  dollarsKeptInMichigan: number;     // Σ closed-pool PO totals with michiganBased suppliers + Σ accepted scrap value
}
```

## 10. Seed data (fictional businesses, real Michigan places)

**Suppliers (3), each with 4–6 catalog items, 1–2 bulk tiers, a delivery fee of about $35–75 and a free-delivery minimum of about $300–600:**
- A Detroit restaurant and janitorial supplier (Michigan-based): paper towels, napkins, cups, cleaner.
- A Grand Rapids lumber yard (Michigan-based): 2x4 studs, plywood, OSB.
- A national farm-supply chain branch in Lansing (`michiganBased: false`), to contrast with the Michigan figure.

**Businesses (about 10), with lat/lng:**
- 3 Detroit cafés or salons, all using the Detroit supplier.
- A Grand Rapids furniture maker and a Detroit contractor, both using the lumber yard.
- 2 farms within 60 miles of the lumber buyers (Kent and Washtenaw counties).
- The three existing seed businesses, kept.

**State at startup:**
- One open pool at the Detroit supplier, containing 2 pre-parsed orders and sitting at about 70–80% of free delivery. The live café order pushes it past the threshold.
- 2 active scrap `requesting` listings: the farms want wood chips or offcuts for animal bedding.

The demo moment is the live café order crossing free delivery, followed by the furniture maker's lumber order triggering a scrap offer to a Kent County farm. Seeded orders are pre-parsed and stored, so **only live orders call Granite**.

## 11. Build order (2 hours, 2 backend devs, in Bob IDE)

| Time | Dev A | Dev B |
|---|---|---|
| 0:00–0:15 | Types (§6) and route stubs that return seed-shaped responses for every new endpoint (§9). **Push. The frontend is now unblocked.** | Seed data (§10), `/api/demo/reset`, `/api/suppliers` |
| 0:15–0:55 | `pricing.ts` with a quick test of solo vs pooled on the seed numbers; `pools.ts` join/create and the viewer and operator views | `parser.ts`: alias fallback first, then Granite; `writer.ts` templates |
| 0:55–1:30 | `POST /close` → PO and invoices; `payments.ts` (mock first, then Stripe test) | `scrap.ts` inference and matching; `/api/scrap-offers`; Granite reasons |
| 1:30–1:45 | `metrics.ts`; integrate with the frontend | Run the full demo path against the real UI; fix |
| 1:45–2:00 | **Freeze.** Rehearse the demo path twice from `demo/reset`; record the result in `STATE.md` | Same |

Rule: each step lands working with its fallback **before** the Granite or Stripe version is added. If time runs short, cut from the bottom of §12, never the fallbacks.

**Frontend work, in parallel against the stubs:**
- Persona switcher (sets `X-Business-Id`).
- "Place order" form: business, supplier dropdown, free-text box.
- Order result card: parsed lines, pool progress bar, your savings, any scrap offer.
- Holder's offer inbox with accept and decline.
- Operator "Close pool" view: PO email and invoice list with Stripe IDs.
- Metrics strip.
- A "powered by watsonx.ai Granite" label on every AI-written string.
- Optional: a Google Map of businesses.

## 12. Stretch (only after §11 passes rehearsal), in value order
1. **watsonx Orchestrate agent.** Import a small OpenAPI spec for `POST /api/orders` and `GET /api/pools` as tools, so a user can type "order 2 cases of Bounty from Motor City Restaurant Supply" in chat. Strengthens "clear application of IBM technology." Needs a reachable URL, which means Code Engine or a tunnel.
2. Deploy to IBM Code Engine, with the local run as fallback.
3. Swap the in-memory store for Cloudant.
4. Warehouse matching with the same "need near / have near" engine.

## 13. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Granite slow, down or returning bad JSON | 8 s timeout, then the alias parser, scrap map and text templates. `parsedBy` shows which ran. |
| Stripe key missing or erroring | `mock_succeeded` invoices. The demo still completes. |
| A pooled-savings figure looks wrong live | Pricing unit-tested on the seed before 0:55. The operator view shows the arithmetic. |
| The frontend can't wire everything | Stubs from 0:15. Old pages still work as a backup demo. |
| Code Engine unavailable | Run locally. Record a backup video of the demo path. |
| Bob not visibly central | Code in Bob throughout. Screenshots in `bob_usage/`. A 15 s Bob clip in the pitch. |

## 14. Pitch answers to prepare (no code)
- **Why suppliers agree:** bigger, predictable orders, fewer trips and new customers with no sales cost.
- **Revenue:** SupplyMash keeps a share of the savings (illustrative 15–20%).
- **Credit risk as buyer of record:** cards are charged before the supplier is paid.
- **Getting enough businesses in one area:** launch with one Detroit neighborhood and one regional supplier, then expand.
- **Michigan impact:** small businesses buying together compete with national chains, money stays with Michigan suppliers, and scrap stays in Michigan supply chains.

## 15. Left to the builder
File layout inside `services/`, the Granite prompt wording, the exact Granite model, JSON validation approach, Stripe SDK details, and seed names and numbers within the ranges above.
- The model must be a current Granite chat model in the Dallas region and not on the banned list.
- Seed numbers must make the live café order cross free delivery and the lumber order produce a scrap match.
