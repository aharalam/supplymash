# Implementation plan

Approved 2026-11-13. Detailed design: `docs/superpowers/specs/2026-11-13-supplymash-order-first-design.md`. Build prompts for IBM Bob: `docs/BOB_HANDOFF.md`.

## Architecture and stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind. Persona switcher sets `X-Business-Id`. Optional Google Maps view.
- **Backend:** the existing Node.js, Express and TypeScript service with an in-memory store, extended with:
  - `services/parser` (Granite, alias fallback)
  - `services/pricing` (solo vs pooled, bulk tiers, delivery split)
  - `services/pools` (join/merge, viewer and operator views, close → PO and invoices)
  - `services/scrap` (Granite byproduct inference → nearest requester within 60 miles)
  - `services/writer` (Granite text, templates as fallback)
  - `services/payments` (Stripe test mode, mock fallback)
  - `services/metrics`
- **IBM:**
  - Bob IDE for all coding (required).
  - watsonx.ai Granite for three narrow JSON jobs.
  - Stretch: an Orchestrate agent using the API as tools, Code Engine deploy, Cloudant.
- **Google Cloud:** Maps JavaScript API on the frontend only.
- **New API:**
  - `GET /api/suppliers`
  - `POST/GET /api/orders`
  - `GET /api/pools[/:id]`
  - `POST /api/pools/:id/close`
  - `GET /api/scrap-offers`
  - `GET /api/metrics`
  - `POST /api/demo/reset`
  - Legacy endpoints stay; they hide pending inferred scrap.

## Vertical slices (in order)

1. Stub endpoints with seed-shaped data, so the frontend is unblocked at 0:15.
2. Order → parse (fallback first, then Granite) → pool join with real pricing.
3. Inferred scrap offer → holder accepts or declines.
4. Close pool → PO email, then Stripe charges (mock first).
5. Metrics, frontend integration, then freeze and rehearse from `demo/reset`.

## Ownership and timeline (2-hour backend)

- **Dev A:** types and stubs → pricing and pools → close and payments → metrics.
- **Dev B:** seed and reset → parser and writer → scrap → integration testing.
- **Frontend (2):** build against the stubs, following §11 of the spec.
- **Feature freeze** at 1:45, with two full rehearsals.

## Risks

- Granite or Stripe outages: covered by fallbacks.
- Savings maths: unit-tested on the seed.
- Hosting confusion: run locally and record a backup video.
- Bob visibility: keep usage screenshots in `bob_usage/`.

Event deadline and timezone: UNKNOWN. Verify on ibm.biz/midevfest26.
