# Competition and product brief

## Competition

- **Event:** Michigan DevFest Hackathon 2026
- **Rules PDF:** `HackathonGuide.pdf` (extracted from official hackathon S3 bucket)
- **Tracks targeted:**
  - **Reinvigorating Main Street** — empowering Michigan small businesses with AI tools for inventory management and operations CONFIRMED
  - **Modernizing Michigan Manufacturing** — supply chain optimization that keeps production in Michigan CONFIRMED
- **Official sources:** [Hackathon Guide PDF](https://private-hackathons-2026.s3.us-east.cloud-object-storage.appdomain.cloud/112601_HackathonGuide.pdf). Participant site: ibm.biz/midevfest26 (login required).
- **Required technology:** CONFIRMED.
  - The solution must showcase **IBM Bob IDE as a core component** to be eligible for judging.
  - Each participant puts a Bob budget-usage PNG in `bob_usage/`.
  - 50 Bobcoins per person, with no top-up.
- **Optional IBM tech:** watsonx.ai (Granite), watsonx Orchestrate (Builder role; agents and tools via OpenAPI/MCP), Code Engine, Cloudant, Speech-to-Text, Text-to-Speech. $100 shared credit; the account is suspended at 100%. CONFIRMED.
- **Banned models** (hurt judging): llama-3-405b-instruct, mistral-medium-2505, mistral-small-3-1-24b-instruct-2503. CONFIRMED.
- **Out of scope:** Orchestrate AgentOps; watsonx.ai Agent Lab, BYOM, fine-tuning, AutoAI, governance, Evaluation Studio, SPSS. CONFIRMED.
- **Deployment:** UNKNOWN. The guide says to use Code Engine so judges can try the app live, but elsewhere says the hackathon accounts "do not support solution deployment." Keep a local-run fallback.
- **Other tech:** any framework is allowed. Google Cloud is allowed but not mentioned by IBM. CONFIRMED.
- **Data rules:** bring your own data, with no PI, client, confidential or social-media data. Public data only with commercial-use terms; keep a source list. CONFIRMED.
- **Secrets:** IBM keys found in a public repo are deactivated and the account suspended. CONFIRMED.
- **Judging:** 25 points, averaged across judges, 5 points per criterion. CONFIRMED (pasted by team from the participant site).
  - Completeness and feasibility, including clear use of IBM tech.
  - Creativity and innovation in applying AI.
  - Design and usability.
  - Effectiveness and efficiency: measurable impact and scale.
  - Michigan impact: keeping value, jobs and opportunity in Michigan, with strong storytelling.
- **Team:** 4 people (2 frontend, 2 backend). CONFIRMED.
- **Backend build budget:** 2 hours. CONFIRMED (team, 2026-11-13).
- **Deadline / submission format / demo length:** UNKNOWN.

## Product (approved 2026-11-13)

- **Approved MVP:** the order-first design in `docs/superpowers/specs/2026-11-13-supplymash-order-first-design.md`. It supersedes the earlier listings-board MVP. The old pages stay as a backup demo and for warehouses.
- **Problem:** Michigan small businesses each buy alone. They pay full unit prices and a delivery fee on every order, and they throw away byproducts that neighbors would buy.
- **Solution:** businesses place normal orders on SupplyMash and name their usual supplier. SupplyMash:
  - pools orders anonymously, for bulk tiers and shared or free delivery
  - infers from purchases what scrap the business will produce, and offers it to nearby requesters
- **Buyer of record:** SupplyMash. The supplier invoices SupplyMash once, and each business is charged its share through Stripe test mode.
- **Differentiator:** no one has to list their scrap, because the order is the signal. Granite parses messy order text and infers byproducts.
- **Track:** Reinvigorating Main Street (primary). Manufacturing and sustainability are story points.
- **Non-goals:** real payments, logins, delivery, a supplier portal, Stripe Connect payouts, and AI warehouse matching (warehouses are pitched as the next feature).
- **Anti-goals:**
  - Exposing pool members or unaccepted scrap to other businesses.
  - Savings figures that can't be traced to the seeded price list.
  - A demo that depends on Granite or Stripe being up.
  - Real card data or personal information.
- **Core demo moment:**
  1. A Detroit café types a messy order, and Granite parses it.
  2. The anonymous pool crosses free delivery.
  3. A Grand Rapids furniture maker's lumber order triggers an inferred offcut offer to a Kent County farm, which the furniture maker accepts.
  4. The operator closes the pool: one purchase order email goes to the supplier, and Stripe test charges go to each business.
  5. The metrics strip shows dollars saved, deliveries avoided, pounds diverted and dollars kept in Michigan.
- **Name:** the repo uses "SupplyMash"; the original PDF says "SupplyMesh". UNKNOWN which is final.

### IBM Bob IDE usage evidence
- Screenshots go in `bob_usage/` before submission.
- File naming: `teamname_midevfest26_IBM_Bob_usage.png`.
