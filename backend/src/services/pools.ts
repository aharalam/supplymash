/**
 * Pool join/create, merge-on-second-order, and viewer/operator views.
 *
 * §8A step 3  — find or create the open Pool for a supplier, attach the order,
 *               recalculate pricing for every order.  If this business already
 *               has an order in that pool, merge the new lines into it.
 *
 * §6 privacy rule — viewer (X-Business-Id present):
 *   memberCount, progress, deadline, their own order/savings only.
 *   No other business IDs, names, or lines.
 *
 * Without the header: operator view with all orders, subtotal, PO, invoices.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/store';
import {
  Invoice,
  Order,
  OrderLine,
  Pool,
  PoolView,
  PoolOperatorView,
  PurchaseOrder,
  Supplier,
} from '../types';
import { bestUnitPrice, calcOrderCosts, calcProgress, poolCombinedQty, poolSubtotal, round2 } from './pricing';
import { charge } from './payments';
import { poEmail } from './writer';

// ── internals ─────────────────────────────────────────────────────────────────

function getSupplier(supplierId: string): Supplier {
  const s = db.suppliers.find((s) => s.id === supplierId);
  if (!s) throw new Error(`Supplier ${supplierId} not found`);
  return s;
}

/** Merge new lines into an existing order: same SKU adds qty, new SKU appended. */
function mergeLines(existing: OrderLine[], incoming: OrderLine[]): OrderLine[] {
  const merged = existing.map((l) => ({ ...l }));
  for (const inc of incoming) {
    const found = merged.find((m) => m.sku === inc.sku);
    if (found) {
      found.qty += inc.qty;
    } else {
      merged.push({ ...inc });
    }
  }
  return merged;
}

// ── exported service functions ────────────────────────────────────────────────

/**
 * Find the single open pool for a supplier, or create one with a 3-day deadline.
 */
export function findOrCreatePool(supplierId: string): Pool {
  const existing = db.pools.find(
    (p) => p.supplierId === supplierId && p.status === 'open',
  );
  if (existing) return existing;

  const pool: Pool = {
    id: uuidv4(),
    supplierId,
    orderIds: [],
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'open',
  };
  db.pools.push(pool);
  return pool;
}

/**
 * Join an order to a pool.
 *
 * Rules (§8A step 3):
 *  - If the business already has an order in this pool, merge the incoming lines
 *    into it and return the updated order.
 *  - Otherwise, add the new order to the pool.
 *  - Either way, recalculate pricing for every order in the pool.
 *
 * Returns the order that belongs to this business after the operation.
 */
export function joinPool(pool: Pool, incomingOrder: Order): Order {
  // Check whether this business already has an order in the pool.
  const existingOrder = db.orders.find(
    (o) => o.poolId === pool.id && o.businessId === incomingOrder.businessId,
  );

  let resultOrder: Order;

  if (existingOrder) {
    // Merge new lines into the existing order.
    existingOrder.lines = mergeLines(existingOrder.lines, incomingOrder.lines);
    existingOrder.rawText += '\n' + incomingOrder.rawText;
    resultOrder = existingOrder;
  } else {
    // New member: persist the order and register in the pool.
    db.orders.push(incomingOrder);
    pool.orderIds.push(incomingOrder.id);
    resultOrder = incomingOrder;
  }

  return resultOrder;
}

// ── view builders ─────────────────────────────────────────────────────────────

/**
 * Build a viewer-safe PoolView for the given business.
 * Returns null if the pool doesn't exist.
 */
export function buildPoolView(poolId: string, viewerBusinessId: string): PoolView | null {
  const pool = db.pools.find((p) => p.id === poolId);
  if (!pool) return null;

  const supplier = getSupplier(pool.supplierId);
  const allOrders = db.orders.filter((o) => pool.orderIds.includes(o.id));
  const { progressPct, nextMilestone } = calcProgress(allOrders, supplier);

  const viewerOrder = allOrders.find((o) => o.businessId === viewerBusinessId);
  let viewerFields: Partial<PoolView> = {};

  if (viewerOrder) {
    const costs = calcOrderCosts(viewerOrder, allOrders, supplier);
    // Find the viewer's invoice on the pool if the pool is closed.
    const yourInvoice = pool.invoices?.find((inv) => inv.businessId === viewerBusinessId);
    viewerFields = {
      yourOrderId: viewerOrder.id,
      yourSoloCost: costs.soloCost,
      yourPooledCost: costs.pooledCost,
      yourSavings: costs.savings,
      ...(yourInvoice ? { yourInvoice } : {}),
    };
  }

  if (!viewerOrder) {
    const failed = pool.invoices?.find((inv) => inv.businessId === viewerBusinessId);
    if (failed) viewerFields = { yourOrderId: failed.orderId, yourInvoice: failed };
  }

  return {
    id: pool.id,
    supplierName: supplier.name,
    deadline: pool.deadline,
    status: pool.status,
    memberCount: allOrders.length,
    progressPct,
    nextMilestone,
    ...viewerFields,
  };
}

/**
 * Build an operator PoolView (no X-Business-Id).
 * Returns null if the pool doesn't exist.
 */
export function buildOperatorView(poolId: string): PoolOperatorView | null {
  const pool = db.pools.find((p) => p.id === poolId);
  if (!pool) return null;

  const supplier = getSupplier(pool.supplierId);
  const allOrders = db.orders.filter((o) => pool.orderIds.includes(o.id));
  const { progressPct, nextMilestone } = calcProgress(allOrders, supplier, { includeTierHints: true });
  const pSub = poolSubtotal(allOrders, supplier);

  const business = (id: string) => db.businesses.find((b) => b.id === id);

  const orders = allOrders.map((o) => {
    const costs = calcOrderCosts(o, allOrders, supplier);
    return {
      businessName: business(o.businessId)?.name ?? o.businessId,
      lines: o.lines,
      soloCost: costs.soloCost,
      pooledCost: costs.pooledCost,
    };
  });

  return {
    id: pool.id,
    supplierName: supplier.name,
    deadline: pool.deadline,
    status: pool.status,
    memberCount: allOrders.length,
    progressPct,
    nextMilestone,
    orders,
    subtotal: pSub,
    ...(pool.purchaseOrder ? { purchaseOrder: pool.purchaseOrder } : {}),
    ...(pool.invoices ? { invoices: pool.invoices } : {}),
  };
}

/**
 * Build a PoolView from an order's perspective (used in POST /api/orders response).
 * Equivalent to buildPoolView, exposed for direct import by the orders controller.
 */
export { buildPoolView as buildViewForOrder };

// ── close (spec §8C–D) ────────────────────────────────────────────────────────

const closing = new Set<string>();

export class PoolCloseError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/**
 * Close a pool: charge every member BEFORE building the PO. Declined members are
 * dropped, pricing is recalculated once, and remaining members are charged any
 * difference. Then the combined PO is built from the remaining orders.
 */
export async function closePool(poolId: string): Promise<{ purchaseOrder: PurchaseOrder; invoices: Invoice[] }> {
  const pool = db.pools.find((p) => p.id === poolId);
  if (!pool) throw new PoolCloseError(404, 'Pool not found');
  if (pool.status !== 'open') throw new PoolCloseError(409, 'Pool is already closed');
  if (closing.has(pool.id)) throw new PoolCloseError(409, 'Pool is already closing');
  const supplier = getSupplier(pool.supplierId);
  let orders = db.orders.filter((o) => pool.orderIds.includes(o.id));
  if (orders.length === 0) throw new PoolCloseError(409, 'Pool has no orders');

  closing.add(pool.id);
  try {
    const businessOf = (o: Order) => db.businesses.find((b) => b.id === o.businessId)!;
    const firstCosts = new Map(orders.map((o) => [o.id, calcOrderCosts(o, orders, supplier)]));
    const charges = new Map<string, Awaited<ReturnType<typeof charge>>>();
    for (const o of orders) {
      charges.set(o.id, await charge(businessOf(o), firstCosts.get(o.id)!.pooledCost, `SupplyMash pool ${pool.id} – ${supplier.name}`));
    }

    const failedOrders = orders.filter((o) => charges.get(o.id)!.status === 'failed');
    const failedInvoices: Invoice[] = failedOrders.map((o) => {
      const c = firstCosts.get(o.id)!;
      return { businessId: o.businessId, orderId: o.id, soloCost: c.soloCost, pooledCost: c.pooledCost, savings: 0, stripePaymentIntentId: charges.get(o.id)!.paymentIntentId, status: 'failed' };
    });

    if (failedOrders.length > 0) {
      orders = orders.filter((o) => !failedOrders.includes(o));
      pool.orderIds = orders.map((o) => o.id);
      // One recalculation; remaining members can only owe the same or more.
      for (const o of orders) {
        const delta = round2(calcOrderCosts(o, orders, supplier).pooledCost - firstCosts.get(o.id)!.pooledCost);
        // ponytail: a declined delta charge is absorbed by SupplyMash; add dunning if this ever matters.
        if (delta > 0) await charge(businessOf(o), delta, `SupplyMash pool ${pool.id} adjustment`);
      }
    }

    const invoices: Invoice[] = orders.map((o) => {
      const c = calcOrderCosts(o, orders, supplier);
      const ch = charges.get(o.id)!;
      return { businessId: o.businessId, orderId: o.id, soloCost: c.soloCost, pooledCost: c.pooledCost, savings: c.savings, stripePaymentIntentId: ch.paymentIntentId, status: ch.status };
    });

    const combined = poolCombinedQty(orders);
    const lines = [...combined.entries()].map(([sku, qty]) => {
      const item = supplier.catalog.find((c) => c.sku === sku)!;
      return { sku, name: item.name, qty, unitPrice: bestUnitPrice(item, qty) };
    });
    const subtotal = poolSubtotal(orders, supplier);
    const deliveryFee = subtotal >= supplier.freeDeliveryMinimum || orders.length === 0 ? 0 : supplier.deliveryFee;
    const stops = orders.map((o) => `${businessOf(o).name}, ${businessOf(o).location.city}`);
    const email = await poEmail({ poolId: pool.id, supplierName: supplier.name, lines, subtotal, deliveryFee, total: round2(subtotal + deliveryFee), stops });

    const purchaseOrder: PurchaseOrder = {
      supplierId: supplier.id,
      lines,
      subtotal,
      deliveryFee,
      total: round2(subtotal + deliveryFee),
      emailText: email.text,
      emailBy: email.by,
    };

    pool.status = 'closed';
    pool.purchaseOrder = purchaseOrder;
    pool.invoices = [...invoices, ...failedInvoices];
    for (const o of orders) o.status = 'invoiced';
    return { purchaseOrder, invoices: pool.invoices };
  } finally {
    closing.delete(pool.id);
  }
}
