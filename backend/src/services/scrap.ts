/**
 * Inferred scrap exchange (spec §8A step 4, §8B).
 *
 * From the lines a business just ordered, infer the scrap it will produce,
 * match each byproduct to the nearest active request within 60 miles, and ask
 * the holder (anonymously) whether to sell. Rule-based inference always runs;
 * Granite can refine quantities and add categories, but can't drop a rule hit,
 * so the demo's lumber → offcuts moment never depends on the model.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/store';
import { Business, Location, Match, MaterialCategory, Order, OrderLine, ResourceListing, ScrapOffer, Supplier } from '../types';
import { graniteJSON } from './granite';
import { days, scrapReason } from './writer';

export const MAX_DISTANCE_MILES = 60;
const DEFAULT_PRICE_SHARE = 0.8; // suggested price = 80% of the requester's max (spec §4)

const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'wood_lumber', 'metal_scrap', 'plastic', 'cardboard_paper', 'food_byproduct',
  'textile', 'electronics', 'chemicals', 'other',
];

export interface Byproduct {
  materialCategory: MaterialCategory;
  title: string;
  estLbs: number;
  readyInDays: number;
}

/** Catalog category → typical byproduct. ponytail: one rule; add rows as suppliers are added. */
const RULES: Record<string, { materialCategory: MaterialCategory; title: string; share: number; readyInDays: number }> = {
  lumber: { materialCategory: 'wood_lumber', title: 'Wood offcuts and sawdust', share: 0.1, readyInDays: 14 },
};

function lineWeightLbs(line: OrderLine, supplier: Supplier): number {
  const item = supplier.catalog.find((c) => c.sku === line.sku);
  return line.qty * (item?.weightLbsPerUnit ?? 0);
}

export function ruleByproducts(lines: OrderLine[], supplier: Supplier): Byproduct[] {
  const byCategory = new Map<string, number>();
  for (const line of lines) {
    const cat = supplier.catalog.find((c) => c.sku === line.sku)?.category;
    if (cat && RULES[cat]) byCategory.set(cat, (byCategory.get(cat) ?? 0) + lineWeightLbs(line, supplier));
  }
  return [...byCategory.entries()]
    .map(([cat, lbs]) => {
      const r = RULES[cat];
      return { materialCategory: r.materialCategory, title: r.title, estLbs: Math.round(lbs * r.share), readyInDays: r.readyInDays };
    })
    .filter((b) => b.estLbs > 0);
}

/** Scrap is a small share of what was bought; anything outside this band is a bad guess. */
const MIN_SCRAP_SHARE = 0.02;
const MAX_SCRAP_SHARE = 0.25;

/**
 * Validate Granite's byproduct JSON. Exported for tests.
 * Rejects estimates outside 2–25% of the order's weight and titles that are just
 * a purchased product (e.g. "Plywood Sheet 4x8"): the rule-based offer is used instead.
 */
export function validateGraniteByproducts(raw: unknown, totalLbs: number, productNames: string[] = []): Byproduct[] {
  if (!Array.isArray(raw)) return [];
  const out: Byproduct[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const { materialCategory, title, estLbs, readyInDays } = e as Record<string, unknown>;
    if (!MATERIAL_CATEGORIES.includes(materialCategory as MaterialCategory)) continue;
    if (typeof title !== 'string' || !title.trim() || title.length > 80) continue;
    if (typeof estLbs !== 'number' || estLbs < totalLbs * MIN_SCRAP_SHARE || estLbs > totalLbs * MAX_SCRAP_SHARE) continue;
    const t = title.trim().toLowerCase();
    if (productNames.some((n) => n.toLowerCase().includes(t) || t.includes(n.toLowerCase()))) continue;
    const days = typeof readyInDays === 'number' && readyInDays >= 0 && readyInDays <= 90 ? Math.round(readyInDays) : 14;
    out.push({ materialCategory: materialCategory as MaterialCategory, title: title.trim(), estLbs: Math.round(estLbs), readyInDays: days });
  }
  return out;
}

async function inferByproducts(lines: OrderLine[], supplier: Supplier): Promise<Byproduct[]> {
  const rules = ruleByproducts(lines, supplier);
  const totalLbs = lines.reduce((sum, l) => sum + lineWeightLbs(l, supplier), 0);
  const raw = await graniteJSON(
    'You estimate the reusable scrap or byproducts a small business will produce from what it buys. ' +
      'Scrap means leftovers such as offcuts, sawdust, trimmings or packaging, never the purchased products themselves. ' +
      'It is usually 5-15% of the purchased weight. ' +
      'Reply with ONLY a JSON array: [{"materialCategory": one of ' + JSON.stringify(MATERIAL_CATEGORIES) +
      ', "title": short name like "Pine offcuts and sawdust", "estLbs": number, "readyInDays": number}]. Reply [] if none.',
    `Order from ${supplier.name}:\n` +
      lines.map((l) => `${l.qty} ${l.unit} of ${l.name} (~${lineWeightLbs(l, supplier)} lbs total)`).join('\n'),
    { maxTokens: 250 },
  );
  const fromGranite = validateGraniteByproducts(raw, totalLbs, lines.map((l) => l.name));
  // Granite refines a category the rules found; rules keep the category if Granite missed it.
  const merged = new Map<MaterialCategory, Byproduct>();
  for (const b of rules) merged.set(b.materialCategory, b);
  for (const b of fromGranite) merged.set(b.materialCategory, b);
  return [...merged.values()];
}

export function distanceMiles(a: Location, b: Location): number {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

const TYPE_LABEL: Record<string, string> = {
  farm: 'A farm', restaurant: 'A café', construction: 'A contractor', manufacturer: 'A manufacturer',
  factory: 'A factory', retailer: 'A retailer', other: 'A business',
};

function anonLabel(b: Business | undefined, miles: number): string {
  return `${TYPE_LABEL[b?.type ?? 'other'] ?? 'A business'} ${Math.round(miles)} mi away`;
}

function nearestRequest(byproduct: Byproduct, holder: Business): { listing: ResourceListing; miles: number } | null {
  let best: { listing: ResourceListing; miles: number } | null = null;
  for (const l of db.listings) {
    if (l.type !== 'requesting' || l.status !== 'active') continue;
    if (l.materialCategory !== byproduct.materialCategory || l.businessId === holder.id) continue;
    const alreadyPending = db.matches.some(
      (m) => m.direction === 'ask_holder' && m.status === 'pending' && m.requestingListingId === l.id &&
        db.listings.find((x) => x.id === m.offeringListingId)?.businessId === holder.id,
    );
    if (alreadyPending) continue;
    const miles = distanceMiles(holder.location, l.location);
    if (miles <= MAX_DISTANCE_MILES && (!best || miles < best.miles)) best = { listing: l, miles };
  }
  return best;
}

/**
 * Infer byproducts from `lines` (the lines just ordered) and create one
 * ask-the-holder offer per byproduct that has a nearby requester.
 * Returns the new offers as seen by the holder.
 */
export async function inferAndOffer(order: Order, lines: OrderLine[], supplier: Supplier): Promise<ScrapOffer[]> {
  const holder = db.businesses.find((b) => b.id === order.businessId);
  if (!holder) return [];
  const byproducts = await inferByproducts(lines, supplier);
  const created: Match[] = [];

  for (const bp of byproducts) {
    const hit = nearestRequest(bp, holder);
    if (!hit) continue;
    const request = hit.listing;
    const requester = db.businesses.find((b) => b.id === request.businessId);
    const price = Math.round(request.pricePerUnit * DEFAULT_PRICE_SHARE * 1000) / 1000;
    const reason = await scrapReason({
      orderSummary: lines.map((l) => `${l.qty} × ${l.name}`).join(', '),
      material: bp.title,
      estLbs: bp.estLbs,
      readyInDays: bp.readyInDays,
      counterpartyLabel: anonLabel(requester, hit.miles),
      requestTitle: request.title,
      pricePerLb: price,
    });

    const listing: ResourceListing = {
      id: uuidv4(),
      businessId: holder.id,
      businessName: holder.name,
      type: 'offering',
      materialCategory: bp.materialCategory,
      title: bp.title,
      description: `Inferred from order ${order.id}`,
      quantity: bp.estLbs,
      unit: 'lbs',
      pricePerUnit: price,
      location: holder.location,
      status: 'proposed',
      createdAt: new Date().toISOString(),
      source: 'inferred_from_order',
      orderId: order.id,
      readyInDays: bp.readyInDays,
    };
    db.listings.push(listing);

    const qtyRatio = Math.min(bp.estLbs, request.quantity) / Math.max(bp.estLbs, request.quantity);
    const match: Match = {
      id: uuidv4(),
      offeringListingId: listing.id,
      requestingListingId: request.id,
      offeringBusiness: holder.name,
      requestingBusiness: request.businessName,
      material: bp.title,
      compatibilityScore: Math.round(60 + 25 * (1 - hit.miles / MAX_DISTANCE_MILES) + 15 * qtyRatio),
      aiReasoning: reason.text,
      reasoningBy: reason.by,
      status: 'pending',
      createdAt: new Date().toISOString(),
      direction: 'ask_holder',
      suggestedPricePerUnit: price,
    };
    db.matches.push(match);
    created.push(match);
  }
  return created.map((m) => toScrapOffer(m, holder.id)).filter((o): o is ScrapOffer => o !== null);
}

/** View of an ask-holder match for one business. Null if that business isn't a party. */
export function toScrapOffer(match: Match, viewerId: string): ScrapOffer | null {
  const offer = db.listings.find((l) => l.id === match.offeringListingId);
  const request = db.listings.find((l) => l.id === match.requestingListingId);
  if (!offer || !request) return null;
  const role = offer.businessId === viewerId ? 'holder' : request.businessId === viewerId ? 'requester' : null;
  if (!role) return null;

  const counterpartyId = role === 'holder' ? request.businessId : offer.businessId;
  const counterparty = db.businesses.find((b) => b.id === counterpartyId);
  const miles = distanceMiles(offer.location, request.location);
  const accepted = match.status === 'accepted' || match.status === 'completed';
  const price = match.suggestedPricePerUnit ?? offer.pricePerUnit;
  // The stored reasoning is written for the holder and describes their order.
  // The requester gets its own text so the holder's purchases are never revealed.
  const requesterText =
    `${accepted ? counterparty?.name ?? 'A nearby business' : anonLabel(counterparty, miles)} expects about ` +
    `${offer.quantity} ${offer.unit} of ${offer.title.toLowerCase()} within ${days(offer.readyInDays ?? 14)}, ` +
    `matching your request ("${request.title}"). Suggested price: $${price.toFixed(3)}/lb; you pick it up.`;
  return {
    matchId: match.id,
    role,
    material: offer.title,
    estQty: offer.quantity,
    unit: offer.unit,
    readyInDays: offer.readyInDays ?? 14,
    suggestedPricePerUnit: price,
    counterpartyLabel: accepted ? counterparty?.name ?? 'Unknown business' : anonLabel(counterparty, miles),
    distanceMiles: Math.round(miles),
    aiReasoning: role === 'holder' ? match.aiReasoning : requesterText,
    reasoningBy: role === 'holder' ? match.reasoningBy ?? 'template' : 'template',
    status: accepted ? 'accepted' : match.status === 'declined' ? 'declined' : 'pending',
  };
}

/** True for inferred-scrap records that must stay hidden from legacy endpoints until accepted. */
export function isHiddenScrapMatch(m: Match): boolean {
  return m.direction === 'ask_holder' && m.status !== 'accepted' && m.status !== 'completed';
}

export function isHiddenScrapListing(l: ResourceListing): boolean {
  return l.source === 'inferred_from_order' && (l.status === 'proposed' || l.status === 'expired');
}
