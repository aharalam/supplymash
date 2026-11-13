# Frontend handoff: order-first API

**Update (backend complete):** every endpoint below now returns **real data**. All backend prompts are done and covered by `npm test` in `backend/` (74 tests plus 19 pricing checks). The shapes match what you built against the stubs. Three small additions:

- `ScrapOffer.reasoningBy` and `PurchaseOrder.emailBy` (`'granite' | 'template'`): show the "powered by watsonx.ai Granite" label **only** when the value is `'granite'`.
- Missing or blank fields on `POST /api/orders` now return **400**. **422** means the text didn't match anything in the catalog, and its `error` suggests items to try.

Full contract: spec §9 in `docs/superpowers/specs/2026-11-13-supplymash-order-first-design.md`.
TypeScript shapes: `backend/src/types/index.ts`. Copy the "§6" and "§9" sections into `frontend/src/api/types.ts`; don't hand-write them.

## Running it

- Backend: `cd backend && npm run dev`, on port 3001.
- Frontend: `cd frontend && npm run dev`, on port 5173. Next rewrites `/api/*` to the backend, so keep the existing axios `baseURL: '/api'`. No CORS setup is needed.
- Between rehearsals: `POST /api/demo/reset` reseeds data, with the same fixed IDs every time.
- On demo day, run the backend without auto-restart (`npm run build && npm start`). The dev server restarts on every file save, and a restart wipes in-memory data.

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

| Call | Use it for |
|---|---|
| `GET /api/businesses` | Persona switcher list. Each business has `usualSupplierIds`. |
| `GET /api/suppliers` | Supplier dropdown, plus the catalog for hints. |
| `POST /api/orders` `{businessId, supplierId, text}` | Order form. Returns `201 {order, pool, scrapOffers, parsedBy}`. |
| `GET /api/orders` (header **required**) | "My orders", each with `pool`. |
| `GET /api/pools` / `GET /api/pools/:id` | Pool card or progress bar (with header), or the operator table (no header). |
| `POST /api/pools/:id/close` | Operator "Close pool" button. Returns `{purchaseOrder, invoices}`. A second click returns 409. |
| `GET /api/scrap-offers` (header **required**) | Scrap offer inbox. |
| `PUT /api/matches/:matchId/respond` `{status:'accepted'\|'declined'}` (header) | Accept or decline. Show buttons **only when `role === 'holder'`**; anyone else gets 403. |
| `GET /api/metrics` | Metrics strip. |
| `GET /api/notifications` (header **required**) | Updates feed, `{ unreadCount, notifications }`, newest first. Covers: pool grew, pool closed, card declined, scrap offer made, accepted or declined. |
| `POST /api/notifications/read` (header) | Mark all of the viewer's updates read. |
| `POST /api/demo/reset` | Hidden "Reset demo" button. |

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

## Exact demo numbers (after `POST /api/demo/reset`)

| Step | What the API returns |
|---|---|
| Greektown views pools before ordering | 2 members, 78.14%, next milestone "Free delivery at $350.00", $76.50 to go |
| Greektown orders "3 cases of 8 oz cups and 3 gallons of cleaner" | 3 members, 100%, alone $144.00 → pooled $99.00, **saves $45.00** |
| Corktown / Midtown after that | Save $45.00 and $52.50 (free delivery for everyone) |
| Furniture maker orders "60 2x4s and 10 sheets of 3/4 plywood" | 1 scrap offer: "A farm 11 mi away", 114 lbs at $0.056/lb |
| Furniture maker accepts | Both sides now see real names |
| Operator closes `pool-detroit-01` | PO total $372.50 with free delivery; 3 invoices |
| Metrics | $142.50 saved, 2 deliveries avoided, 114 lbs diverted, $378.88 kept in Michigan |

`parsedBy` and `reasoningBy` say `fallback` and `template` until watsonx keys are set in `backend/.env`. With keys, they say `granite`.

**With Granite on** (verified live with `ibm/granite-4-h-small`), Granite refines the scrap estimate:
- The lumber order becomes "Pine offcuts and sawdust", 99 lbs, ready in 1 day.
- Metrics then show 99 lbs diverted and $378.04 kept in Michigan.
- The output is stable run to run (temperature 0).
- The pricing numbers above don't change.
