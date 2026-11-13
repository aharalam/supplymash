# SupplyMash frontend

Next.js App Router + React + TypeScript + Tailwind CSS.

Run `npm install`, then `npm run dev` (http://localhost:5173).
Start the Express backend separately on port 3001. Next.js proxies `/api/*` to it; set `API_URL` to override the backend origin before building or starting development.

Production: `npm run build`, then `npm start`.
Validation: `npm run typecheck` and `npm run lint`.

Routes: `/`, `/recycling`, `/order-pooling`, `/warehouses`, `/register`.
Client screen components live in `src/screens`; route files and shared layout live in `src/app`.
