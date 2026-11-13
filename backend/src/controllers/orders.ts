import { Request, Response } from 'express';
import { Order, PoolView, ScrapOffer } from '../types';

// ── Stub data ──────────────────────────────────────────────────────────────────

const STUB_ORDER: Order = {
  id: 'ord-stub-001',
  businessId: 'biz-001',
  supplierId: 'sup-001',
  rawText: '3 cases paper towels and 2 packs all-purpose cleaner',
  lines: [
    { sku: 'PT-100', name: 'Paper Towels (case/12)', qty: 3, unit: 'case', soloUnitPrice: 38.00 },
    { sku: 'CLN-500', name: 'All-Purpose Cleaner (gal, 4-pk)', qty: 2, unit: 'pack', soloUnitPrice: 29.00 },
  ],
  poolId: 'pool-stub-001',
  parsedBy: 'fallback',
  status: 'pooled',
  createdAt: new Date().toISOString(),
};

const STUB_POOL_VIEW: PoolView = {
  id: 'pool-stub-001',
  supplierName: 'Motor City Restaurant Supply',
  deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'open',
  memberCount: 3,
  progressPct: 87,
  nextMilestone: { label: 'Free delivery at $400', amountNeeded: 52.00 },
  yourOrderId: 'ord-stub-001',
  yourSoloCost: 172.00,
  yourPooledCost: 148.00,
  yourSavings: 24.00,
};

const STUB_SCRAP_OFFERS: ScrapOffer[] = [
  {
    matchId: 'match-scrap-001',
    role: 'holder',
    material: 'Wood offcuts / chips',
    estQty: 50,
    unit: 'lbs',
    readyInDays: 5,
    suggestedPricePerUnit: 0.08,
    counterpartyLabel: 'A farm 18 mi away',
    distanceMiles: 18,
    aiReasoning: 'Your paper goods order implies packaging offcuts. A nearby farm has requested wood chips for animal bedding — this is a good match.',
    status: 'pending',
  },
];

// ── Handlers ──────────────────────────────────────────────────────────────────

export function createOrder(req: Request, res: Response): void {
  const { businessId, supplierId, text } = req.body ?? {};
  if (!businessId || !supplierId || !text) {
    res.status(422).json({ error: 'businessId, supplierId, and text are required' });
    return;
  }
  res.status(201).json({
    order: { ...STUB_ORDER, businessId, supplierId, rawText: text as string },
    pool: STUB_POOL_VIEW,
    scrapOffers: STUB_SCRAP_OFFERS,
    parsedBy: 'fallback',
  });
}

export function getOrders(req: Request, res: Response): void {
  const businessId = req.headers['x-business-id'] as string | undefined;
  const orders: (Order & { pool: PoolView })[] = [
    { ...STUB_ORDER, businessId: businessId ?? 'biz-001', pool: STUB_POOL_VIEW },
  ];
  res.json(orders);
}
