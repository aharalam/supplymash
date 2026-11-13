import { Request, Response } from 'express';
import { db } from '../models/store';
import { Metrics } from '../types';
import { calcOrderCosts, round2 } from '../services/pricing';

const LBS_PER_UNIT: Record<string, number> = { lbs: 1, lb: 1, tons: 2000, ton: 2000, kg: 2.20462 };

/** Spec §9 Metrics definitions. */
export function computeMetrics(): Metrics {
  let dollarsSavedClosed = 0;
  let dollarsSavedProjected = 0;
  let deliveriesAvoided = 0;
  let dollarsKeptInMichigan = 0;

  for (const pool of db.pools) {
    const supplier = db.suppliers.find((s) => s.id === pool.supplierId);
    if (!supplier) continue;
    if (pool.status === 'closed') {
      const paid = (pool.invoices ?? []).filter((i) => i.status !== 'failed');
      dollarsSavedClosed += paid.reduce((sum, i) => sum + i.savings, 0);
      deliveriesAvoided += Math.max(0, paid.length - 1);
      if (supplier.michiganBased && pool.purchaseOrder) dollarsKeptInMichigan += pool.purchaseOrder.total;
    } else {
      const orders = db.orders.filter((o) => pool.orderIds.includes(o.id));
      for (const o of orders) dollarsSavedProjected += calcOrderCosts(o, orders, supplier).savings;
    }
  }

  let lbsDiverted = 0;
  for (const m of db.matches) {
    if (m.status !== 'accepted' && m.status !== 'completed') continue;
    const offer = db.listings.find((l) => l.id === m.offeringListingId);
    const request = db.listings.find((l) => l.id === m.requestingListingId);
    if (!offer || !request) continue;
    // Inferred offers move their estimate; legacy matches move what both sides can trade.
    const qty = m.direction === 'ask_holder' ? offer.quantity : Math.min(offer.quantity, request.quantity);
    const lbs = qty * (LBS_PER_UNIT[offer.unit.toLowerCase()] ?? 0);
    lbsDiverted += lbs;
    const price = m.suggestedPricePerUnit ?? offer.pricePerUnit;
    if (lbs > 0) dollarsKeptInMichigan += qty * price;
  }

  return {
    dollarsSaved: round2(dollarsSavedClosed + dollarsSavedProjected),
    dollarsSavedClosed: round2(dollarsSavedClosed),
    dollarsSavedProjected: round2(dollarsSavedProjected),
    deliveriesAvoided,
    lbsDiverted: Math.round(lbsDiverted),
    dollarsKeptInMichigan: round2(dollarsKeptInMichigan),
  };
}

export function getMetrics(_req: Request, res: Response): void {
  res.json(computeMetrics());
}
