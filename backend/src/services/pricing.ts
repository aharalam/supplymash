/**
 * §7 Pricing rules.
 *
 * All money is USD, stored and returned as a number with 2 decimal places.
 *
 * SOLO COST
 *   = Σ(line.qty × line.soloUnitPrice)  +  deliveryFee  (waived if subtotal ≥ freeDeliveryMinimum)
 *
 * POOLED COST
 *   Each SKU is priced at the best bulkTier reached by the pool's combined qty for that SKU.
 *   Delivery: if the pooled subtotal ≥ freeDeliveryMinimum → $0.
 *   Otherwise each order pays: deliveryFee × (order pooled subtotal / pool pooled subtotal).
 *
 * POOL POOLED SUBTOTAL ("pool subtotal")
 *   Always the tier-priced subtotal: Σ over all orders and lines of qty × tier-priced unitPrice.
 *   List prices are never used for it.
 *
 * PROGRESS
 *   pool pooled subtotal / freeDeliveryMinimum, capped at 100 %.
 *
 * NEXT MILESTONE
 *   The first unreached threshold across all SKUs in the pool (next bulk tier not yet triggered)
 *   and free delivery (if not yet reached), whichever requires the smaller additional spend.
 */

import { CatalogItem, Order, OrderLine, Supplier } from '../types';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Round a dollar amount to cents. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Best unit price for a given combined qty against the catalog item's bulk tiers. */
export function bestUnitPrice(item: CatalogItem, combinedQty: number): number {
  // Sort ascending by minQty; apply every tier the combined qty meets.
  const tiers = [...item.bulkTiers].sort((a, b) => a.minQty - b.minQty);
  let price = item.unitPrice;
  for (const tier of tiers) {
    if (combinedQty >= tier.minQty) price = tier.unitPrice;
  }
  return price;
}

// ── pool-level aggregation ────────────────────────────────────────────────────

/** Combined qty for each SKU across all orders in the pool. */
export function poolCombinedQty(orders: Order[]): Map<string, number> {
  const qty = new Map<string, number>();
  for (const order of orders) {
    for (const line of order.lines) {
      qty.set(line.sku, (qty.get(line.sku) ?? 0) + line.qty);
    }
  }
  return qty;
}

/**
 * Pool pooled subtotal: Σ tier-priced line cost across all orders.
 * This is the figure the supplier will actually invoice.
 */
export function poolSubtotal(orders: Order[], supplier: Supplier): number {
  const combined = poolCombinedQty(orders);
  let total = 0;
  for (const order of orders) {
    for (const line of order.lines) {
      const item = supplier.catalog.find((c) => c.sku === line.sku);
      if (!item) continue;
      const up = bestUnitPrice(item, combined.get(line.sku) ?? line.qty);
      total += line.qty * up;
    }
  }
  return round2(total);
}

// ── per-order cost ────────────────────────────────────────────────────────────

export interface OrderCosts {
  soloSubtotal: number;
  soloCost: number;       // subtotal + delivery (delivery waived if solo subtotal ≥ freeDeliveryMinimum)
  pooledSubtotal: number; // tier-priced for this order alone
  pooledCost: number;     // pooledSubtotal + prorated delivery
  savings: number;        // soloCost − pooledCost, never < 0
}

/**
 * Calculate solo and pooled costs for one order, given the full set of orders in its pool.
 *
 * @param order      The order to cost.
 * @param allOrders  All orders currently in the pool (including `order`).
 * @param supplier   The supplier for this pool.
 */
export function calcOrderCosts(
  order: Order,
  allOrders: Order[],
  supplier: Supplier,
): OrderCosts {
  const combined = poolCombinedQty(allOrders);

  // ── solo cost ───────────────────────────────────────────────────────────────
  // Solo = what this business would pay ordering alone, including any bulk tier
  // its own quantity already reaches, so savings never overstate pooling.
  let soloSubtotal = 0;
  for (const line of order.lines) {
    const item = supplier.catalog.find((c) => c.sku === line.sku);
    soloSubtotal += line.qty * (item ? bestUnitPrice(item, line.qty) : line.soloUnitPrice);
  }
  soloSubtotal = round2(soloSubtotal);
  const soloDelivery = soloSubtotal >= supplier.freeDeliveryMinimum ? 0 : supplier.deliveryFee;
  const soloCost = round2(soloSubtotal + soloDelivery);

  // ── pooled cost ─────────────────────────────────────────────────────────────
  let pooledSubtotal = 0;
  for (const line of order.lines) {
    const item = supplier.catalog.find((c) => c.sku === line.sku);
    if (!item) {
      pooledSubtotal += line.qty * line.soloUnitPrice; // unknown SKU: fall back to list price
      continue;
    }
    pooledSubtotal += line.qty * bestUnitPrice(item, combined.get(line.sku) ?? line.qty);
  }
  pooledSubtotal = round2(pooledSubtotal);

  const pSubtotal = poolSubtotal(allOrders, supplier);
  let pooledDelivery = 0;
  if (pSubtotal < supplier.freeDeliveryMinimum) {
    // Pro-rated share of the delivery fee.
    pooledDelivery = pSubtotal > 0
      ? round2(supplier.deliveryFee * (pooledSubtotal / pSubtotal))
      : supplier.deliveryFee;
  }
  const pooledCost = round2(pooledSubtotal + pooledDelivery);
  const savings = round2(Math.max(0, soloCost - pooledCost));

  return { soloSubtotal, soloCost, pooledSubtotal, pooledCost, savings };
}

// ── progress and next milestone ───────────────────────────────────────────────

export interface ProgressResult {
  progressPct: number;
  nextMilestone: { label: string; amountNeeded: number } | null;
}

/**
 * Progress toward free delivery, and the next reachable milestone.
 *
 * "Pool subtotal" is always the tier-priced total (spec §7).
 * Milestones considered:
 *   1. Free delivery (if not yet reached).
 *   2. For each SKU whose combined qty is below the next tier, the spend needed to
 *      reach that tier (expressed as spend on that SKU at the current unit price × gap qty).
 * Returns the milestone that requires the least additional spend.
 *
 * Bulk-tier milestones name other members' items, so they are included only
 * when `includeTierHints` is true (operator view). Business viewers get the
 * free-delivery milestone only (spec §6 privacy rule).
 */
export function calcProgress(
  orders: Order[],
  supplier: Supplier,
  { includeTierHints = false }: { includeTierHints?: boolean } = {},
): ProgressResult {
  const pSub = poolSubtotal(orders, supplier);
  const progressPct = Math.min(100, round2((pSub / supplier.freeDeliveryMinimum) * 100));

  // Candidates for nextMilestone
  const candidates: { label: string; amountNeeded: number }[] = [];

  // 1. Free delivery
  if (pSub < supplier.freeDeliveryMinimum) {
    const needed = round2(supplier.freeDeliveryMinimum - pSub);
    candidates.push({
      label: `Free delivery at $${supplier.freeDeliveryMinimum.toFixed(2)}`,
      amountNeeded: needed,
    });
  }

  // 2. Next bulk tier for each SKU currently in the pool (operator only)
  const combined = includeTierHints ? poolCombinedQty(orders) : new Map<string, number>();
  for (const [sku, combinedQty] of combined) {
    const item = supplier.catalog.find((c) => c.sku === sku);
    if (!item) continue;
    const tiers = [...item.bulkTiers].sort((a, b) => a.minQty - b.minQty);
    for (const tier of tiers) {
      if (combinedQty < tier.minQty) {
        // The gap is (tier.minQty - combinedQty) units; each costs the current tier price.
        const currentPrice = bestUnitPrice(item, combinedQty);
        const gapQty = tier.minQty - combinedQty;
        const amountNeeded = round2(gapQty * currentPrice);
        candidates.push({
          label: `Bulk tier on ${item.name}: add ${gapQty} ${item.unit}${gapQty !== 1 ? 's' : ''} → $${tier.unitPrice.toFixed(2)}/${item.unit}`,
          amountNeeded,
        });
        break; // only the nearest next tier per SKU
      }
    }
  }

  if (candidates.length === 0) {
    return { progressPct, nextMilestone: null };
  }

  // Pick the milestone closest to being reached (smallest amountNeeded).
  candidates.sort((a, b) => a.amountNeeded - b.amountNeeded);
  return { progressPct, nextMilestone: candidates[0] };
}
