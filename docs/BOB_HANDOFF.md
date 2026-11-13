# IBM Bob handoff: building the SupplyMash backend

The approved scope is `docs/superpowers/specs/2026-11-13-supplymash-order-first-design.md` (called "the spec" below). It is the source of truth. Bob builds the backend from it inside the existing `backend/` Express + TypeScript app.

## Before you start (people, about 5 minutes)
1. Open this repo in **Bob IDE**, signed in with your hackathon account.
2. `cd backend && cp .env.example .env`. Fill in:
   - the watsonx.ai values: API key, project ID, and the Dallas URL
   - a Stripe **test** key starting with `sk_test_`
   Never commit `.env`.
3. Decide who runs Dev A and who runs Dev B (spec §11). Each person runs their own prompts in their own Bob chat.
4. Watch your Bobcoins: 50 each, with no top-up. Use **Plan mode** for prompt 0, then **Code mode**. Start a new chat between phases so the context stays small.
5. Before submitting, each person saves a Bob budget-usage PNG to `bob_usage/`, named `teamname_midevfest26_IBM_Bob_usage.png`.

## Prompts to paste into Bob, in order

**Prompt 0: plan (one person, Plan mode)**
> Read AGENTS.md, .hackathon/BRIEF.md, and @docs/superpowers/specs/2026-11-13-supplymash-order-first-design.md. Then read backend/src. Produce a short implementation plan for spec §11 split into Dev A and Dev B tracks. Do not write code yet. Flag anything in the spec that conflicts with the existing code.

**Prompt 1: unblock the frontend (Dev A, Code mode, target 15 min)**
> Implement spec §6 types in backend/src/types and stub route handlers for every new endpoint in spec §9 (suppliers, orders, pools, pools/:id/close, scrap-offers, metrics, demo/reset). Stubs return realistic hard-coded data in exactly the §9 response shapes. Wire the routes in src/index.ts. Do not change existing endpoints. Run `npm run dev` and curl each new endpoint to show it responds.

Then commit and push so the frontend can build against the stubs.

**Prompt 2: seed data (Dev B, Code mode)**
> Implement spec §10 seed data in backend/src/models/store.ts. Keep the three existing businesses. Add the suppliers, the ~10 businesses with lat/lng and usualSupplierIds, the open Detroit pool with 2 pre-parsed orders at 70–80% of free delivery, and the 2 farm scrap requests. Add a reseed function used by POST /api/demo/reset. Check that the numbers make one more café order cross free delivery.

**Prompt 3: pricing and pools (Dev A)**
> Implement spec §7 in backend/src/services/pricing.ts and pool join/create, merge-on-second-order, and viewer/operator views (spec §6 privacy rule, §8A step 3) in services/pools.ts. Replace the stubs for GET /api/pools and /api/pools/:id. Add a small script or test proving solo vs pooled costs on the seed data match a hand calculation.

**Prompt 4: parser and writer (Dev B)**
> Implement services/parser.ts per spec §8A step 2. Write the alias/keyword fallback first and verify it, then add watsonx.ai Granite (use the @ibm-cloud/watsonx-ai Node SDK with env vars from .env, a current Granite chat model, never a model on the banned list in BRIEF.md). Return validated JSON only, 8 s timeout, fall back on any failure, and set parsedBy. Implement services/writer.ts with templates plus a Granite version for reasons, scrap offers, and PO email text.

**Prompt 5: orders endpoint (Dev A)**
> Implement POST /api/orders and GET /api/orders per spec §8A and §9 using the parser, pools and pricing services. Return 422 with a readable message when nothing parses.

**Prompt 6: scrap inference (Dev B)**
> Implement services/scrap.ts and GET /api/scrap-offers per spec §8A step 4 and §8B. Include: proposed listings hidden from the legacy /api/listings, /api/matches and triggerMatching; holder-only respond for ask_holder matches (403 otherwise); expiring the listing on decline; anonymous counterparty labels until accepted.

**Prompt 7: close and payments (Dev A)**
> Implement services/payments.ts and POST /api/pools/:id/close per spec §8C–D. Write the mock path first. Then add Stripe test mode: refuse non-sk_test_ keys, create customers with pm_card_visa at startup, charge before building the PO, and on a card decline drop the order and recalculate once.

**Prompt 8: metrics and freeze (both)**
> Implement GET /api/metrics per the §9 Metrics definitions. Then run the full demo path from POST /api/demo/reset with curl:
> 1. The live café order crosses free delivery.
> 2. The furniture maker's lumber order creates a scrap offer to a Kent County farm.
> 3. The holder accepts.
> 4. The pool closes, producing a PO and invoices.
> 5. Metrics update.
>
> Fix anything broken. Then update .hackathon/STATE.md with what works, the commit SHA, and known issues.

## Rules for Bob
- The spec wins. If code and spec disagree, ask a human; don't improvise.
- Every Granite and Stripe call needs a working fallback before you move on.
- Never put keys in code or commits.
- Do not change the frontend; the frontend team owns `frontend/`.
- Stretch work (spec §12) only after prompt 8 passes.
