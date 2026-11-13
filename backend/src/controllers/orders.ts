import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/store';
import { Order } from '../types';
import { parseOrder } from '../services/parser';
import { findOrCreatePool, joinPool, buildPoolView } from '../services/pools';
import { inferAndOffer } from '../services/scrap';

// ── POST /api/orders (spec §8A) ───────────────────────────────────────────────

export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const { businessId, supplierId, text } = (req.body ?? {}) as { businessId?: unknown; supplierId?: unknown; text?: unknown };
    if (typeof businessId !== 'string' || typeof supplierId !== 'string' || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'businessId, supplierId, and text are required' });
      return;
    }
    if (text.length > 2000) {
      res.status(400).json({ error: 'Order text is too long (2000 characters max)' });
      return;
    }
    const business = db.businesses.find((b) => b.id === businessId);
    if (!business) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }
    const supplier = db.suppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    const { lines, parsedBy } = await parseOrder(text, supplier);
    if (lines.length === 0) {
      const examples = supplier.catalog.slice(0, 3).map((c) => c.aliases[0] ?? c.name).join(', ');
      res.status(422).json({ error: `We couldn't match anything in that order to ${supplier.name}'s catalog. Try naming items like: ${examples}.` });
      return;
    }

    // Re-read the open pool after the await so concurrent orders land in the same pool.
    const pool = findOrCreatePool(supplier.id);
    const incoming: Order = {
      id: uuidv4(),
      businessId,
      supplierId,
      rawText: text,
      lines,
      poolId: pool.id,
      parsedBy,
      status: 'pooled',
      createdAt: new Date().toISOString(),
    };
    // joinPool merges into this business's existing order if it has one; use what it returns.
    const order = joinPool(pool, incoming);
    const scrapOffers = await inferAndOffer(order, lines, supplier);

    res.status(201).json({ order, pool: buildPoolView(pool.id, businessId), scrapOffers, parsedBy });
  } catch (err) {
    console.error('[orders] create failed', err);
    res.status(500).json({ error: 'Could not place the order' });
  }
}

// ── GET /api/orders (header X-Business-Id) ────────────────────────────────────

export function getOrders(req: Request, res: Response): void {
  const businessId = req.header('x-business-id');
  if (!businessId) {
    res.status(400).json({ error: 'X-Business-Id header required' });
    return;
  }
  const orders = db.orders
    .filter((o) => o.businessId === businessId)
    .map((o) => ({ ...o, pool: buildPoolView(o.poolId, businessId) }));
  res.json(orders);
}
