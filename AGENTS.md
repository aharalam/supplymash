# SupplyMash — agent operating contract

**Project:** SupplyMash — Michigan DevFest Hackathon 2026  
**Stack:** React + Vite (frontend) | Node.js + Express (backend) | TypeScript throughout  
**Goal:** A working proof-of-concept that connects Michigan businesses to share resources, reduce waste, and cut delivery costs.

---

## Context files — read these at the start of every session

| File | What it contains |
|---|---|
| `.hackathon/BRIEF.md` | Competition facts, tracks, required IBM tools, approved MVP, non-goals, demo moment |
| `.hackathon/PLAN.md` | Architecture, task ownership, critical-path milestones |
| `.hackathon/STATE.md` | Last verified end-to-end demo (commit SHA, environment, scenario, known failures) |
| `.hackathon/RESEARCH.md` | Problem research |

---

## Project structure

```
supplymash/
├── frontend/              # React 18 + Vite + TypeScript + Tailwind CSS
│   └── src/
│       ├── pages/         # Dashboard, RecyclingExchange, OrderPooling, Warehouses, Register
│       ├── components/    # Shared UI components
│       └── api/           # Axios API client
├── backend/               # Node.js + Express + TypeScript
│   └── src/
│       ├── routes/        # Express routers
│       ├── controllers/   # Request handlers
│       ├── models/        # In-memory store (replace with Cloudant for prod)
│       ├── services/      # Business logic (AI matching goes here)
│       └── types/         # Shared TypeScript types
├── bob_usage/             # IBM Bob IDE screenshots — REQUIRED for submission
└── .hackathon/            # Competition docs
```

---

## Hackathon requirements (do not violate)

1. **IBM Bob IDE must be used** — screenshots go in `bob_usage/`. File naming: `teamname_midevfest26_IBM_Bob_usage.png`.
2. **Never commit secrets** — IBM Cloud API keys, Cloudant credentials, watsonx keys must stay in `.env` (gitignored). Use `.env.example` as the template.
3. **Keep the demo working** — before any large refactor, verify the end-to-end demo flow still works and update `STATE.md`.

---

## Development commands

```bash
# Backend
cd backend && npm run dev        # tsx watch, port 3001

# Frontend
cd frontend && npm run dev       # Vite HMR, port 5173, proxies /api to 3001

# Health check
curl http://localhost:3001/api/health
```

---

## Upgrade paths (do after MVP demo is working)

### Add IBM watsonx.ai semantic matching
- Install: `npm install @ibm-cloud/watsonx-ai` in backend
- Replace the heuristic in `src/controllers/matches.ts` with a Granite model prompt
- Store `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL` in `backend/.env`

### Add IBM Cloudant persistence
- Install: `npm install @ibm-cloud/cloudant` in backend
- Replace the in-memory arrays in `src/models/store.ts` with Cloudant document operations
- Store `CLOUDANT_URL`, `CLOUDANT_API_KEY` in `backend/.env`

### Deploy to IBM Code Engine
- Build Docker images: `docker compose build`
- Push to IBM Container Registry and configure Code Engine job
- Set environment variables in Code Engine app config

---

## Operating principles

**Working demo over unfinished features. IBM Bob IDE usage is a hard requirement. Keep secrets out of git. Update STATE.md after every verified demo.**

---

## Original hackathon-os workflow skills

The following skills from the hackathon-os workflow are available and can be activated when useful:

- `.agents/skills/hackathon-competition/SKILL.md` — competition intelligence, rubric, submission
- `.agents/skills/problem-research/SKILL.md` — structured problem research
- `.agents/skills/grilling/SKILL.md` — adversarial assumption challenge (opt-in)
- `.agents/skills/demo-readiness/SKILL.md` — demo verification checklist
- `.agents/skills/impeccable/SKILL.md` — UI/UX design craft
- `.agents/skills/ponytail/SKILL.md` — scoped code simplification
