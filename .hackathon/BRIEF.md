# Competition and product brief

## Competition

- **Event:** Michigan DevFest Hackathon 2026
- **Rules PDF:** `HackathonGuide.pdf` (extracted from official hackathon S3 bucket)
- **Tracks targeted:**
  - **Reinvigorating Main Street** — empowering Michigan small businesses with AI tools for inventory management and operations CONFIRMED
  - **Modernizing Michigan Manufacturing** — supply chain optimization that keeps production in Michigan CONFIRMED
- **Required technology:** IBM Bob IDE (must include bob_usage/ screenshot in repo) CONFIRMED
- **Optional technologies:** IBM watsonx.ai (Granite models), IBM watsonx Orchestrate, IBM Code Engine, IBM Cloudant, Speech-to-Text, Text-to-Speech CONFIRMED
- **Submission requirement:** Upload a Bob budget usage screenshot to `bob_usage/` in the repo CONFIRMED
- **Team size:** 4 people (2 frontend, 2 backend) CONFIRMED

## Product

- **Problem:** Michigan businesses operate in silos — wasting materials, paying redundant delivery fees, and unable to afford storage independently.
- **Users:** Small factories, farms, construction companies, restaurants, retailers, and manufacturers across Michigan.
- **Solution:** SupplyMash — a platform that connects businesses to exchange waste materials as raw inputs, combine orders, and share storage.
- **Differentiator:** AI-powered matching that proactively surfaces compatible businesses for resource exchange without manual searching.

### Three core features (all approved MVP):

1. **Industrial Recycling Exchange** — Listings board + AI matching engine. Businesses post excess materials or needs; the engine pairs offerings with requests.
2. **Local Order Pooling** — Businesses join open order pools to split delivery costs from a shared supplier. Estimated savings shown per member.
3. **Shared Micro-Warehouses** — Warehouse listings with sq ft availability. Businesses can rent shared space with lease dates.

### Competition alignment CONFIRMED:
- Main Street: helps small restaurants, retailers, farms compete by cutting operating costs.
- Manufacturing: factories reduce scrap waste and find buyers for byproduct materials.

### Non-goals (MVP scope):
- Real-time payments or invoicing
- Map view / geospatial matching
- Authentication / user accounts
- Mobile app

### Core demo moment:
1. Register a lumber factory and a farm
2. Factory posts excess wood chips as an offering
3. Farm posts a request for wood chips
4. Run AI matching → see the match card with reasoning and score
5. Accept the match → both listings move to "matched"

### IBM Bob IDE usage evidence:
- Screenshots must be saved to `bob_usage/` before submission.
- File naming: `teamname_midevfest26_IBM_Bob_usage.png`
