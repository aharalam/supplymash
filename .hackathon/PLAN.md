# Implementation plan

## Architecture and stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + React Router + Axios
- **Backend:** Node.js + Express + TypeScript, in-memory store for MVP
- **AI matching:** Heuristic engine (MVP); upgrade path to IBM watsonx.ai Granite model for semantic matching
- **Storage:** In-memory (MVP); upgrade path to IBM Cloudant for persistence
- **Deployment:** Local dev (MVP); upgrade path to IBM Code Engine container
- **Monorepo structure:** `frontend/` and `backend/` directories, shared `docker-compose.yml`

## Components and data flow

```
Browser (React SPA)
  ↕ axios /api/*
Express REST API (port 3001)
  ↕ in-memory store
  Matching engine (src/controllers/matches.ts)
```

## Biggest technical unknown and fastest proof

Proving the AI matching value story with IBM watsonx.ai is the riskiest dependency.  
**Fastest proof:** The heuristic matcher in `src/controllers/matches.ts` demonstrates the concept end-to-end without an IBM Cloud account.  
**Next step:** Wire in watsonx.ai SDK with a Granite model call to replace the heuristic when IBM Cloud credentials are available.

## Core demo journey (vertical slices)

| Slice | What is shown | Status |
|---|---|---|
| Register businesses | POST /api/businesses → see in dashboard | ✅ Done |
| Post recycling listings | POST /api/listings → see on exchange board | ✅ Done |
| Run AI matching | POST /api/matches/run → see match cards with reasoning | ✅ Done |
| Accept a match | PUT /api/matches/:id/respond → listings update to "matched" | ✅ Done |
| Join order pool | POST /api/order-pools/:id/join → savings estimate updates | ✅ Done |
| Rent warehouse | POST /api/warehouses/:id/join → availability decrements | ✅ Done |

## UI direction

- Green brand color (green-800 primary, green-700 accents)
- Clean card-based layout with Tailwind utility classes
- No design library dependency — pure Tailwind CSS

## Critical-path milestones

| Milestone / acceptance evidence | Owner | Target | Status |
|---|---|---|---|
| Backend compiles and health check returns 200 | Backend team | Day 1 | ✅ Done |
| Frontend renders dashboard with live API data | Frontend team | Day 1 | ✅ Done |
| End-to-end demo: register → list → match → accept | Full team | Day 1 | ✅ Done |
| watsonx.ai Granite integration (optional) | Backend team | Day 2 | Pending IBM Cloud access |
| Bob usage screenshot uploaded to bob_usage/ | Each member | Before submission | ⏳ Required |
| IBM Code Engine deployment (optional) | Backend team | Day 2 | Pending |

## Lightweight task ownership

| Task | Owner | Status |
|---|---|---|
| Express API, routes, controllers, types | Backend team (2) | ✅ Done |
| React pages: Dashboard, RecyclingExchange, OrderPooling, Warehouses, Register | Frontend team (2) | ✅ Done |
| watsonx.ai Granite matching integration | Backend team | Pending Cloud access |
| Docker / Code Engine deployment | Backend team | Pending |
| IBM Bob usage screenshots | All 4 members | Required before submit |
| Demo rehearsal + pitch preparation | All | Before submission |

## Event deadline and timezone

Unknown — verify on ibm.biz/midevfest26.

## Demo rehearsal / submission buffer

Schedule a rehearsal 2 hours before the submission deadline.
