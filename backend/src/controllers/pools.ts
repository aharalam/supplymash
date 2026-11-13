import { Request, Response } from 'express';
import { PoolView, PoolOperatorView, PurchaseOrder, Invoice } from '../types';

// ── Stub data ──────────────────────────────────────────────────────────────────

const deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

const STUB_POOL_VIEW: PoolView = {
  id: 'pool-stub-001',
  supplierName: 'Motor City Restaurant Supply',
  deadline,
  status: 'open',
  memberCount: 3,
  progressPct: 87,
  nextMilestone: { label: 'Free delivery at $400', amountNeeded: 52.00 },
  yourOrderId: 'ord-stub-001',
  yourSoloCost: 172.00,
  yourPooledCost: 148.00,
  yourSavings: 24.00,
};

const STUB_OPERATOR_VIEW: PoolOperatorView = {
  id: 'pool-stub-001',
  supplierName: 'Motor City Restaurant Supply',
  deadline,
  status: 'open',
  memberCount: 3,
  progressPct: 87,
  nextMilestone: { label: 'Free delivery at $400', amountNeeded: 52.00 },
  orders: [
    {
      businessName: 'Café A (Detroit)',
      lines: [{ sku: 'PT-100', name: 'Paper Towels (case/12)', qty: 4, unit: 'case', soloUnitPrice: 38.00 }],
      soloCost: 197.00,
      pooledCost: 170.00,
    },
    {
      businessName: 'Café B (Detroit)',
      lines: [{ sku: 'NP-200', name: 'Napkins (case/5000)', qty: 3, unit: 'case', soloUnitPrice: 24.00 }],
      soloCost: 117.00,
      pooledCost: 103.00,
    },
    {
      businessName: 'Salon (Detroit)',
      lines: [{ sku: 'CLN-500', name: 'All-Purpose Cleaner (gal, 4-pk)', qty: 4, unit: 'pack', soloUnitPrice: 29.00 }],
      soloCost: 161.00,
      pooledCost: 141.00,
    },
  ],
  subtotal: 348.00,
};

const STUB_PO: PurchaseOrder = {
  supplierId: 'sup-001',
  lines: [
    { sku: 'PT-100', name: 'Paper Towels (case/12)', qty: 4, unitPrice: 34.00 },
    { sku: 'NP-200', name: 'Napkins (case/5000)', qty: 3, unitPrice: 21.00 },
    { sku: 'CLN-500', name: 'All-Purpose Cleaner (gal, 4-pk)', qty: 4, unitPrice: 25.00 },
  ],
  subtotal: 299.00,
  deliveryFee: 0.00,
  total: 299.00,
  emailText: 'Dear Motor City Restaurant Supply,\n\nPlease fulfill the attached combined order on behalf of SupplyMash. This is a pooled purchase order covering 3 member businesses.\n\nTotal: $299.00. Delivery to: 123 Main St, Detroit, MI 48201.\n\nThank you,\nSupplyMash',
};

const STUB_INVOICES: Invoice[] = [
  { businessId: 'biz-001', orderId: 'ord-stub-001', soloCost: 197.00, pooledCost: 170.00, savings: 27.00, stripePaymentIntentId: 'pi_stub_aaa', status: 'mock_succeeded' },
  { businessId: 'biz-002', orderId: 'ord-stub-002', soloCost: 117.00, pooledCost: 103.00, savings: 14.00, stripePaymentIntentId: 'pi_stub_bbb', status: 'mock_succeeded' },
  { businessId: 'biz-003', orderId: 'ord-stub-003', soloCost: 161.00, pooledCost: 141.00, savings: 20.00, stripePaymentIntentId: 'pi_stub_ccc', status: 'mock_succeeded' },
];

// ── Handlers ──────────────────────────────────────────────────────────────────

export function getPools(req: Request, res: Response): void {
  const businessId = req.headers['x-business-id'] as string | undefined;
  if (businessId) {
    res.json([STUB_POOL_VIEW]);
  } else {
    res.json([STUB_OPERATOR_VIEW]);
  }
}

export function getPool(req: Request, res: Response): void {
  const businessId = req.headers['x-business-id'] as string | undefined;
  if (businessId) {
    res.json(STUB_POOL_VIEW);
  } else {
    res.json(STUB_OPERATOR_VIEW);
  }
}

export function closePool(_req: Request, res: Response): void {
  res.json({ purchaseOrder: STUB_PO, invoices: STUB_INVOICES });
}
