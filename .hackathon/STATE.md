# Current state

- Event / milestone: Michigan DevFest Hackathon 2026. **The order-first backend is complete** (2026-11-13). Prompts 0–3 were built in IBM Bob; prompts 4–8 were finished by Claude at the team's request.
- What works (backend):
  - Orders parsed by Granite, with a keyword fallback.
  - Anonymous pools: tier pricing, free delivery and merging a second order.
  - Inferred scrap offers; only the holder can accept, and offers stay hidden until accepted.
  - Close pool: Stripe test charges (mock without a key; a declined card is dropped and repriced), plus the combined PO email.
  - Metrics, demo reset, and seeded warehouses.
- Verification: `cd backend && npm test` (74 tests + 19 pricing checks), `npm run build`, and the full demo path walked with curl on the built server.
- Verified live: real watsonx.ai Granite and Stripe test mode, and the frontend against the real API (see below).
- Next action:
  1. Push.
  2. Frontend wires the new screens (`docs/FRONTEND_HANDOFF.md`).
  3. Add watsonx and Stripe test keys to `backend/.env` and rerun the demo path.
  4. Every member saves a Bob usage PNG in `bob_usage/`.
- Known failures / blockers:
  - The deadline, submission format and demo length are unknown.
  - Whether deployment is allowed is unclear in the guide.
  - Product name: SupplyMash or SupplyMesh.
- Spec deviation (Claude's call): solo cost uses the bulk tier a business's own quantity reaches, so savings are never overstated.

- **Updates feed added (2026-11-13):** every action by one business that affects another now produces an update for the affected business, shown in its **Updates** panel.
  - Pool grew, with a free-delivery note and the old and new savings.
  - Pool closed, with the amount charged and saved.
  - Card declined.
  - Scrap offer made (to both sides), accepted (with pickup, contact and total) or declined (the request stays open).
  - Accepted scrap offers show the deal details to both sides.
  - Covered by `tests/notifications.test.ts`; 85 tests in total. Verified in the browser.

- **Demo guide walked end to end (2026-11-13), steps 2–5 and 7, in production mode** (`npm start` on both). Every line of the script matched. Fixes from the walk:
  - The Exchange page had no way to find matches after a reset. It now has a **Find matches** button and an empty state that points to Orders.
  - Accepting a match now closes the other pending matches that share its surplus or request: no double-selling. A holder whose pending offer closed this way gets a `scrap_filled` update.
  - With watsonx unreachable, the old code waited out every Granite timeout: orders took 16–24 s. Now there's a 5 s timeout and a 60 s skip after a failure, so the first order takes about 5 s and the rest are instant.
  - 88 tests pass.

## Last verified end-to-end demo
- **Result:** PASSED. The full demo path ran in the browser on the merged frontend and backend.
- **Base commit:** `b40068d82013a997c41a5c24a586506d23e44dd8`, plus the uncommitted integration fixes listed below.
- **Timestamp:** 2026-11-13, America/Detroit.
- **Environment:**
  - Local: backend built (`npm start`, :3001), frontend `next dev` (:5173).
  - Real watsonx.ai (`ibm/granite-4-h-small`, Dallas) and real Stripe **test mode**.
- **Scenario:**
  1. Greektown sees an open pool (2 businesses, $76.50 to free delivery).
  2. It orders "3 cases of 8 oz cups and 3 gallons of cleaner", parsed by Granite. It pays $99 instead of $144.
  3. The furniture maker orders lumber, and Granite offers 99 lbs of pine offcuts to "A farm 11 mi away".
  4. The holder accepts, and names are revealed.
  5. The farm's view shows nothing about the holder's order.
  6. The operator closes the pool: a $372.50 PO with a Granite greeting, and 3 real Stripe test PaymentIntents.
  7. Metrics show $142.50 saved, 2 deliveries avoided, 99 lbs diverted and $378.04 kept in Michigan.
  8. No console errors. At 375px, no horizontal scroll.
- **Fixes made during this run (uncommitted):**
  - Backend:
    - The requester saw the holder's order text (privacy leak).
    - Closed pools still showed a next milestone.
    - The Granite model `granite-3-3-8b-instruct` isn't offered in Dallas, so the default is now `granite-4-h-small`.
    - Granite could call the whole purchase "scrap".
    - "1 days" grammar.
  - Frontend:
    - The Granite label showed even on template text.
    - The price showed as $0.06/lbs instead of $0.056/lb.
    - The order card's scrap offer stayed "pending" after it was accepted.
    - No open-pool view before ordering.
- **Known failures:** none in the demo path.

## Deadline and demo protection
- Event deadline / timezone: UNKNOWN
- Time remaining at last checkpoint: UNKNOWN
- Scope decision / feature freeze: Not applicable
- Fallback demo status: Not prepared
- Submission / rehearsal status: Not started

Update after meaningful milestones and actual end-to-end tests. A passing build is not a verified demo. Do not claim a commit hash validates uncommitted changes.

## Next.js migration checkpoint — 2026-11-13
- Pulled origin/main through d4fd262 with local changes preserved via autostash.
- Frontend migrated to Next.js App Router; Express API retained through /api rewrites.
- Production build and TypeScript validation pass. All five routes and proxied /api/health respond HTTP 200 on http://localhost:5174.
- Fixed corrupted UTF-8 punctuation in screen components, replaced navigation with Next links and active-route states, added hover/focus/press feedback, compact footer, mobile navigation, and responsive registration layout.
- Full visual browser and end-to-end demo verification still pending. This is not a verified demo checkpoint.
- New order-first backend specification is present; its new endpoint implementations have not landed in this pull.

## Premium UI pass — 2026-11-13
- Applied Impeccable and anti-ui-slop: live operational overview replaces promotional hero; self-hosted DM Sans, consistent typography, spacing, navigation, form labels, status colors, and mobile layouts.
- Frontend production build passes. Lint completes with three warnings (legacy public script, Next metadata export, dashboard fetching effect).
- Browser inspection attempted but host unavailable; desktop/mobile visual QA and full interaction rehearsal remain unverified. This does not update the last verified demo.

## Frontend wired to order-first stubs — 2026-11-13
- New `/orders` screen (docs/FRONTEND_HANDOFF.md): persona switcher in the nav (sets `X-Business-Id`, "SupplyMash operator" = no header), place-order form, order result card (parsed lines, parsedBy tag, pool progress, solo vs pooled savings, scrap offers), your orders, scrap offer inbox (accept/decline for holders only), operator pool table with Close pool → PO email + invoices, metrics strip, and a quiet "Reset demo data" button.
- Shared shapes in `frontend/src/api/types.ts`, copied from `backend/src/types`. Legacy pages unchanged apart from the nav.
- Verified in the browser against the backend stubs: operator close pool, business order placement, and accept (shows the expected "Match not found" until backend prompt 6). Desktop, 900px and 375px layouts checked with no horizontal page scroll. Typecheck, lint (no new warnings) and production build pass.
- Not verified: real data (stubs ignore input; IDs don't line up until backend prompt 2). This is not a verified end-to-end demo.
