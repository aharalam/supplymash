# Frontend handoff: order-first API

As of commit `c6ef678`, every new endpoint is live as a **stub**. Stubs return realistic sample data in the final response shapes, so build every screen now. Each endpoint switches to real data as the backend prompts land (table below), and nothing about the shapes changes.

Full contract: spec §9 in `docs/superpowers/specs/2026-11-13-supplymash-order-first-design.md`.
TypeScript shapes: `backend/src/types/index.ts`. Copy the "§6" and "§9" sections into `frontend/src/api/types.ts`; don't hand-write them.

## Running it

- Backend: `cd backend && npm run dev`, on port 3001.
- Frontend: `cd frontend && npm run dev`, on port 5173. Next rewrites `/api/*` to the backend, so keep the existing axios `baseURL: '/api'`. No CORS setup is needed.
- Between rehearsals: `POST /api/demo/reset` reseeds data. It is a no-op until backend prompt 2 lands.

## The one rule: the viewer header

There are no logins. A **persona switcher** chooses which business you are viewing as. Add the header once in `frontend/src/api/index.ts`:

```ts
api.interceptors.request.use((c) => {
  if (currentBusinessId) c.headers['X-Business-Id'] = currentBusinessId;
  return c;
});
```

- **With the header:** business view. Pools are anonymous: a member count and a progress bar, plus only *your* order, savings and invoice. Never show other businesses.
- **Without it:** the "SupplyMash operator / supplier" view, used to close pools and show the purchase order and invoices. Make "Operator" an option in the persona switcher.

## Endpoints

| Call | Use it for | Real after backend prompt |
|---|---|---|
| `GET /api/businesses` | Persona switcher list (existing endpoint) | 2 (new seed) |
| `GET /api/suppliers` | Supplier dropdown, plus the catalog for hints | 2 |
| `POST /api/orders` `{businessId, supplierId, text}` | Order form. Returns `201 {order, pool, scrapOffers, parsedBy}` | 5 |
| `GET /api/orders` (header) | "My orders", each with `pool` | 5 |
| `GET /api/pools` / `GET /api/pools/:id` | Pool card or progress bar (header), or the operator table (no header) | 3 |
| `POST /api/pools/:id/close` | Operator "Close pool" button. Returns `{purchaseOrder, invoices}` | 7 |
| `GET /api/scrap-offers` (header **required**, else 400) | Scrap offer inbox | 6 |
| `PUT /api/matches/:matchId/respond` `{status:'accepted'\|'declined'}` (header) | Accept or decline, shown **only when `role === 'holder'`** | 6 (returns **404 until then**) |
| `GET /api/metrics` | Metrics strip | 8 |
| `POST /api/demo/reset` | Hidden "Reset demo" button | 2 |

Errors always come back as `{ error: string }` with a 4xx status: 400, 403, 404 or 422. Show `error` to the user rather than a generic failure.

## Screens to build

1. **Persona switcher** in the nav: the businesses plus "Operator".
2. **Place order:**
   - Supplier dropdown. Preselect `business.usualSupplierIds[0]` once that field exists (after prompt 2).
   - One free-text box, with placeholder text like "2 cases Bounty and some napkins".
3. **Order result card:**
   - Parsed lines.
   - A small "parsed by watsonx.ai Granite" or "parsed by fallback" tag, based on `parsedBy`.
   - Pool progress bar showing `progressPct` and `nextMilestone.label`.
   - Your solo cost vs pooled cost, with **savings highlighted**.
   - Any scrap offer.
4. **Scrap offers:**
   - Material, quantity, `readyInDays`, suggested price, `counterpartyLabel` and distance.
   - `aiReasoning`, with a "powered by watsonx.ai Granite" label.
   - Accept and decline buttons for the holder; status only for the requester.
5. **Operator pool view:** the order table, then a **Close pool** button. After closing, show the purchase order email text and the invoice list with each Stripe ID and status.
6. **Metrics strip:** dollars saved (closed and projected), deliveries avoided, lbs of waste diverted, and dollars kept in Michigan.

## Demo path the UI must support (about 3 minutes)

1. Viewing as a Detroit café, type a messy order to Motor City Restaurant Supply. The pool crosses free delivery.
2. Viewing as the Grand Rapids furniture maker, order lumber. A scrap offer appears ("A farm 18 mi away").
3. Accept the offer.
4. Viewing as Operator, close the Detroit pool. The PO email and Stripe charges appear.
5. The metrics strip updates.

## Known stub quirks (expected, will be fixed)

- **Stub IDs don't line up yet.** Stubs reference `biz-001` and `pool-stub-001`, but `GET /api/businesses` still returns the 3 old businesses with random IDs that change on every restart. Never hardcode IDs; always read them from the API. Stable seed IDs arrive with prompt 2.
- **`usualSupplierIds` isn't on businesses yet** (prompt 2).
- **Stubs ignore input.** Every order returns the same sample, and the stub scrap reasoning doesn't match the order.
- **Accepting a scrap offer returns 404** until prompt 6. Show the error and move on.
