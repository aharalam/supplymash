import { Request, Response } from 'express';
import { db } from '../models/store';
import { buildPoolView, buildOperatorView, closePool as closePoolService, PoolCloseError } from '../services/pools';

// ── GET /api/pools ────────────────────────────────────────────────────────────
//
// Without X-Business-Id → PoolOperatorView[] for all pools.
// With X-Business-Id    → PoolView[] for pools the viewer is in
//                         PLUS open pools for their usualSupplierIds.

export function getPools(req: Request, res: Response): void {
  const viewerId = req.headers['x-business-id'] as string | undefined;

  if (!viewerId) {
    // Operator view: all pools
    const views = db.pools
      .map((p) => buildOperatorView(p.id))
      .filter(Boolean);
    res.json(views);
    return;
  }

  // Viewer: pools they are already in, plus open pools for their usual suppliers.
  const viewer = db.businesses.find((b) => b.id === viewerId);
  const inPoolIds = new Set<string>();

  // Pools the viewer already has an order in
  for (const order of db.orders) {
    if (order.businessId === viewerId) inPoolIds.add(order.poolId);
  }

  // Open pools for their usual suppliers (even if not yet in them)
  if (viewer) {
    for (const supplierId of viewer.usualSupplierIds) {
      const open = db.pools.find(
        (p) => p.supplierId === supplierId && p.status === 'open',
      );
      if (open) inPoolIds.add(open.id);
    }
  }

  const views = [...inPoolIds]
    .map((id) => buildPoolView(id, viewerId))
    .filter(Boolean);

  res.json(views);
}

// ── GET /api/pools/:id ────────────────────────────────────────────────────────

export function getPool(req: Request, res: Response): void {
  const id = req.params['id'] as string;
  const viewerId = req.headers['x-business-id'] as string | undefined;

  if (viewerId) {
    const view = buildPoolView(id, viewerId);
    if (!view) { res.status(404).json({ error: 'Pool not found' }); return; }
    res.json(view);
  } else {
    const view = buildOperatorView(id);
    if (!view) { res.status(404).json({ error: 'Pool not found' }); return; }
    res.json(view);
  }
}

// ── POST /api/pools/:id/close ─────────────────────────────────────────────────
// Operator action (spec §8C–D): charge members, build the combined PO.

export async function closePool(req: Request, res: Response): Promise<void> {
  try {
    res.json(await closePoolService(req.params['id'] as string));
  } catch (err) {
    if (err instanceof PoolCloseError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error('[pools] close failed', err);
    res.status(500).json({ error: 'Could not close the pool' });
  }
}
