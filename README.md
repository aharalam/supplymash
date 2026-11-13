# SupplyMash

**Connect Michigan businesses to share resources, reduce waste, and cut delivery costs.**

SupplyMash is a proof-of-concept platform built for the **Michigan DevFest Hackathon 2026**.  
It connects local businesses across three focus areas:

| Feature | What it does |
|---|---|
| ♻️ **Industrial Recycling Exchange** | Companies post excess materials (scrap wood, metal, etc.). AI matches them with nearby businesses that need those inputs. |
| 📦 **Local Order Pooling** | Businesses ordering from the same supplier combine their orders to share delivery fees and unlock bulk pricing. |
| 🏭 **Shared Micro-Warehouses** | Small businesses rent shared neighborhood storage, eliminating the cost of private warehouses. |

---

## Project structure

```
supplymash/
├── frontend/        # React + Vite + TypeScript + Tailwind CSS
├── backend/         # Node.js + Express + TypeScript REST API
├── bob_usage/       # IBM Bob IDE usage screenshots (hackathon requirement)
├── .hackathon/      # Competition brief, plan, research, and state
└── .agents/         # AI agent skills and workflow configuration
```

## Tech stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, Axios  
- **Backend:** Node.js, Express, TypeScript, tsx  
- **AI (optional):** IBM watsonx.ai (Granite models) for semantic resource matching  
- **Storage (optional):** IBM Cloudant for persistent data  
- **Deployment (optional):** IBM Code Engine  
- **Dev tooling:** IBM Bob IDE (required by hackathon)

---

## Getting started

### Prerequisites
- Node.js 20+

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in optional IBM keys
npm install
npm run dev            # starts on http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # starts on http://localhost:5173
```

The frontend dev server proxies `/api` to the backend automatically.

### 3. Docker (optional)

```bash
docker compose up --build
```

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET/POST | `/api/businesses` | List / register businesses |
| GET/POST | `/api/listings` | Resource exchange listings |
| GET/POST | `/api/order-pools` | Order pools |
| POST | `/api/order-pools/:id/join` | Join an order pool |
| GET/POST | `/api/warehouses` | Shared warehouse listings |
| POST | `/api/warehouses/:id/join` | Rent warehouse space |
| GET | `/api/matches` | AI-suggested resource matches |
| POST | `/api/matches/run` | Trigger the matching engine |
| PUT | `/api/matches/:id/respond` | Accept or decline a match |

---

## Hackathon requirements

- ✅ IBM Bob IDE used as core development component (see `bob_usage/`)
- ✅ Aligns with **Reinvigorating Main Street** and **Modernizing Michigan Manufacturing** tracks
- ✅ Optional IBM watsonx.ai integration path for AI matching
- ✅ Optional IBM Code Engine deployment path

---

## Team

Built at the Michigan DevFest Hackathon 2026.
