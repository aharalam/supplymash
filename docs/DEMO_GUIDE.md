# SupplyMash demo guide

Everything below has been verified on the `/orders` page with real watsonx Granite and Stripe test mode.

## 1. The day before

1. **Bob screenshots.** In `bob_usage/`, each teammate saves a Bob Budget-badge screenshot named `teamname_midevfest26_IBM_Bob_usage.png`. **Required for eligibility.**
2. **Record a backup video** of section 4, about 3 minutes. Play it if the laptop or Wi-Fi fails.
3. **Rehearse twice with a timer.** One person drives the laptop and one person talks.
4. **Fill in the unknowns** from the hackathon site: the demo length, the submission format, and whether you need a live link.

## 2. Set up the laptop (30 minutes before)

1. Pull the latest code and install packages:
   ```bash
   git pull && (cd backend && npm install) && (cd frontend && npm install)
   ```
2. Check that `backend/.env` has the watsonx keys, `WATSONX_MODEL_ID=ibm/granite-4-h-small` and a Stripe key starting with `sk_test_`.
3. **Start the backend in production mode** (terminal 1). The dev server wipes data whenever a file is saved.
   ```bash
   cd backend && npm run build && npm start
   ```
   The startup log must show `watsonx.ai Granite: configured` and `Stripe: test mode`.
4. **Start the frontend in production mode** (terminal 2):
   ```bash
   cd frontend && npm run build && npm start
   ```
5. **Open these browser tabs:**
   - Tab 1: http://localhost:5173/orders
   - Tab 2: https://dashboard.stripe.com/test/payments, logged in, in **test mode**
6. **Warm up Granite.** The first call is slower because it fetches an IBM login token.
   1. As any café, place one order.
   2. Switch the persona to **SupplyMash operator** and click **Reset demo data** at the bottom of the page.
7. Set browser zoom to about 125% so the room can read the screen. Close other tabs, and turn on Do Not Disturb.

## 3. Right before you start

- The persona switcher (top right) is set to **SupplyMash operator**.
- Click **Reset demo data** once.
- Check that the pool shows 2 businesses and **$273.50**.

## 4. The demo (about 3 minutes)

| Time | Do this | Say this (roughly) |
|---|---|---|
| 0:00 | Nothing on screen yet | "Michigan's small businesses all buy alone. A café in Corktown and one in Midtown each pay full price and a $45 delivery fee from the same supplier, while a furniture shop in Grand Rapids pays to throw away offcuts a farm 11 miles away would buy." |
| 0:25 | Switcher → **Greek Town Espresso · Detroit**. Point at **Open pools near you**. | "Greektown can see that 2 nearby businesses are already ordering from its usual supplier, and that they're $76.50 from free delivery. It can't see who they are or what they buy." |
| 0:45 | In **What do you need?**, type `3 cases of 8 oz cups and 3 gallons of cleaner`, then click **Place order**. | "They type an order the way they'd text it. IBM watsonx Granite turns it into catalog items." |
| 1:00 | Point at **Parsed by watsonx.ai Granite**, **Free delivery reached** and the savings row. | "Their order tips the pool over free delivery and bulk pricing. **$144 alone, $99 pooled: $45 saved.** The other two cafés save too." |
| 1:15 | Switcher → **Lakeshore Furniture Works · Grand Rapids**. Type `60 2x4s and 10 sheets of 3/4 plywood`, then click **Place order**. | "Now a furniture maker buys lumber." |
| 1:30 | Point at the scrap offer: **Pine offcuts and sawdust, ~99 lbs, $0.056/lb, A farm 11 mi away**, and Granite's explanation. | "Nobody listed any scrap. **The order is the signal.** Granite figures out this order will leave offcuts, and we found a farm nearby that asked for exactly that. The farm stays anonymous until the shop says yes." |
| 1:50 | Click **Accept and sell**. Then switch to **Kent County Pastures · Rockford** and point at **Updates**. | "One click. And on the farm's side, they're told right away: who's selling, how much, where to pick it up and who to contact. Nobody had to post anything." |
| 2:00 | Switcher → **SupplyMash operator**. Point at the 3 cafés in the Motor City pool, then click **Close pool**. | "SupplyMash is the buyer of record. When the pool closes, we charge each business first, then send the supplier one order." |
| 2:15 | Point at the purchase order (**$372.50, delivery free**), the email (**Greeting drafted by watsonx.ai Granite**) and the invoices. Flip to the Stripe tab. | "One shipment instead of three. The supplier gets one email. Granite writes the greeting, and every number comes straight from the price list. Each business got its own charge; here they are in Stripe." |
| 2:30 | *(Optional, if time allows.)* Switch to **Greek Town Espresso** and point at **Updates**: "Your pool closed. Charged $99.00, saved $45.00." | "Every business hears what happened to its order." |
| 2:35 | Back to tab 1. Point at the metrics strip. | "**$142.50 saved, 2 deliveries avoided, 99 lbs of waste diverted, $378 kept with Michigan suppliers**, from four clicks." |
| 2:45 | Nothing to click | "We built this in IBM Bob, and watsonx Granite parses orders, infers scrap and writes to suppliers. Next: warehouse sharing on the same matching engine, and a watsonx Orchestrate assistant so owners can order by chat." |

## 5. If something goes wrong

| Problem | What to do or say |
|---|---|
| A tag says **Parsed by fallback matcher**, or there's no Granite label | Keep going. Say: "Venue Wi-Fi can't reach watsonx, so our backup parser takes over and the demo still works." The numbers are the same, but scrap shows 114 lbs instead of 99. |
| An invoice says **Charged (test mock)** | Stripe couldn't be reached. Skip the Stripe tab and keep going. |
| Something looks wrong mid-demo | Switch to operator, click **Reset demo data**, and restart from 0:25. |
| The page won't load | Check both terminals are still running. If they aren't, **play the backup video**. |
| You clicked the wrong persona | Just switch back. Nothing breaks. |

## 6. Judges' likely questions

- **Why would suppliers agree?** Bigger, predictable orders, one delivery route instead of several, and new customers with no sales cost.
- **How do you make money?** A share of the savings (illustrative: 15–20%). SupplyMash is buyer of record and charges businesses before paying the supplier, so there's no credit risk.
- **How do you get enough businesses in one area?** Businesses keep their usual suppliers, so nobody has to switch. Launch with one Detroit neighborhood and one regional supplier, then expand.
- **Is the AI essential?** Yes, in two places. It turns messy text into orders that can actually be combined, and it notices waste nobody bothered to list. Pricing and matching are deliberately plain rules, so the numbers can be audited.
- **Privacy?** Businesses only see an anonymous count and progress bar. Names are revealed only when the scrap holder accepts.
- **How does a business know something happened?** Every cross-business event lands in that business's **Updates** feed:
  - someone joined your pool and your savings rose
  - your pool closed, with what you paid
  - your card was declined
  - a scrap offer was made, accepted or declined
- **What happens after a scrap deal is accepted?** Both sides get each other's contact details, the pickup location and the total. The buyer collects; SupplyMash doesn't move goods.
- **Michigan impact?** Small businesses compete with national chains on price, money stays with Michigan suppliers, and scrap stays in Michigan supply chains instead of landfills.
- **Is it live?** It runs locally against real IBM watsonx and Stripe test mode. Hosting on IBM Code Engine is the next step.

## 7. After the demo

Click **Reset demo data**, so the next run, or the judges trying it themselves, starts clean.
