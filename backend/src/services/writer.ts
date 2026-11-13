/**
 * Human-readable text: scrap-offer reasons and the supplier PO email (spec §8).
 *
 * Granite writes prose only. Numbers in the PO always come from the template
 * table, so a model can never misstate a price or quantity.
 */
import { graniteChat } from './granite';

export type TextSource = 'granite' | 'template';

export interface ScrapReasonFacts {
  orderSummary: string;       // e.g. "60 × 2x4 Stud 8 ft, 10 × 3/4 in Plywood Sheet 4x8"
  material: string;           // e.g. "Wood offcuts and sawdust"
  estLbs: number;
  readyInDays: number;
  counterpartyLabel: string;  // anonymous, e.g. "A farm 11 mi away"
  requestTitle: string;       // the requester's own listing title
  pricePerLb: number;
}

export function templateScrapReason(f: ScrapReasonFacts): string {
  return (
    `Your order (${f.orderSummary}) will likely leave about ${f.estLbs} lbs of ${f.material.toLowerCase()} ` +
    `within ${f.readyInDays} days. ${f.counterpartyLabel} is looking for exactly this ("${f.requestTitle}"). ` +
    `Selling it at $${f.pricePerLb.toFixed(3)}/lb instead of paying to dispose of it keeps the material in Michigan's supply chain.`
  );
}

export async function scrapReason(f: ScrapReasonFacts): Promise<{ text: string; by: TextSource }> {
  const text = await graniteChat(
    'You write one short, friendly explanation (2 sentences, under 60 words) for a small business owner. ' +
      'Plain text only. Never invent names, numbers or facts beyond those given.',
    `Explain why this business should sell its leftover material.\n` +
      `Their order: ${f.orderSummary}\nLikely leftover: about ${f.estLbs} lbs of ${f.material} within ${f.readyInDays} days\n` +
      `Interested buyer: ${f.counterpartyLabel}, whose request says "${f.requestTitle}"\n` +
      `Suggested price: $${f.pricePerLb.toFixed(3)} per lb (buyer picks it up)`,
    { maxTokens: 120 },
  );
  if (text && text.length <= 500) return { text, by: 'granite' };
  return { text: templateScrapReason(f), by: 'template' };
}

export interface PoFacts {
  poolId: string;
  supplierName: string;
  lines: { sku: string; name: string; qty: number; unitPrice: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  stops: string[]; // "Corktown Coffee, Detroit"
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function poTable(f: PoFacts): string {
  const rows = f.lines.map((l) => `  ${l.sku.padEnd(14)} ${String(l.qty).padStart(5)} × ${money(l.unitPrice).padStart(8)}  ${l.name}`);
  return [
    'Order lines (combined quantities, priced at your bulk tiers):',
    ...rows,
    '',
    `Subtotal: ${money(f.subtotal)}`,
    `Delivery: ${f.deliveryFee === 0 ? 'FREE (free-delivery minimum met)' : money(f.deliveryFee)}`,
    `Total:    ${money(f.total)}`,
    '',
    `Delivery stops (one route):\n${f.stops.map((s) => `  • ${s}`).join('\n')}`,
    '',
    'Billing: SupplyMash is the buyer of record. Please invoice SupplyMash once for the total above;',
    'SupplyMash bills each member business its own share.',
  ].join('\n');
}

function templateIntro(f: PoFacts): string {
  return (
    `Hello ${f.supplierName} team,\n\n` +
    `SupplyMash is placing one combined order on behalf of ${f.stops.length} local businesses that already buy from you. ` +
    `Please fulfil it as a single shipment.`
  );
}

export async function poEmail(f: PoFacts): Promise<{ text: string; by: TextSource }> {
  const subject = `Subject: Combined purchase order ${f.poolId} from SupplyMash`;
  const intro = await graniteChat(
    'You write the short opening paragraph (2-3 sentences) of a purchase-order email from SupplyMash to a supplier. ' +
      'Plain text, professional and warm. Do NOT include any numbers, prices, quantities or line items.',
    `Supplier: ${f.supplierName}\nSupplyMash is ordering on behalf of ${f.stops.length} local Michigan businesses that already buy from this supplier, ` +
      `combined into one shipment. Start with "Hello ${f.supplierName} team,".`,
    { maxTokens: 150 },
  );
  const usable = intro && intro.length <= 700 && !/\$\d/.test(intro);
  const body = `${subject}\n\n${usable ? intro : templateIntro(f)}\n\n${poTable(f)}\n\nThank you,\nSupplyMash`;
  return { text: body, by: usable ? 'granite' : 'template' };
}
