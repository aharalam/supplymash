// Order-first API shapes. Copied from backend/src/types/index.ts (§6 and §9 of
// docs/superpowers/specs/2026-11-13-supplymash-order-first-design.md).
// Keep in sync with the backend; don't hand-edit the shapes.

export interface Location {
  city: string;
  state: string;
  zipCode: string;
  lat?: number;
  lng?: number;
}

/** The fields the order-first screens read from GET /api/businesses. */
export interface BusinessSummary {
  id: string;
  name: string;
  type: string;
  location: Location;
  usualSupplierIds?: string[]; // arrives with backend prompt 2
}

// ── §6 Order-first additions ──────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  location: Location;
  michiganBased: boolean;
  deliveryFee: number;
  freeDeliveryMinimum: number;
  catalog: CatalogItem[];
}

export interface CatalogItem {
  sku: string;
  name: string;
  aliases: string[];
  category: string;
  unit: string;
  unitPrice: number;
  bulkTiers: { minQty: number; unitPrice: number }[];
  weightLbsPerUnit?: number;
}

export interface Order {
  id: string;
  businessId: string;
  supplierId: string;
  rawText: string;
  lines: OrderLine[];
  poolId: string;
  parsedBy: 'granite' | 'fallback';
  status: 'pooled' | 'invoiced';
  createdAt: string;
}

export interface OrderLine {
  sku: string;
  name: string;
  qty: number;
  unit: string;
  soloUnitPrice: number;
}

export interface Pool {
  id: string;
  supplierId: string;
  orderIds: string[];
  deadline: string;
  status: 'open' | 'closed';
  purchaseOrder?: PurchaseOrder;
  invoices?: Invoice[];
}

export interface PurchaseOrder {
  supplierId: string;
  lines: { sku: string; name: string; qty: number; unitPrice: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  emailText: string;
  /** Who wrote the greeting. Numbers always come from the price list. */
  emailBy: 'granite' | 'template';
}

export interface Invoice {
  businessId: string;
  orderId: string;
  soloCost: number;
  pooledCost: number;
  savings: number;
  stripePaymentIntentId?: string;
  status: 'succeeded' | 'mock_succeeded' | 'failed';
}

// ── §9 response shapes ────────────────────────────────────────────────────────

export interface PoolView {
  id: string;
  supplierName: string;
  deadline: string;
  status: 'open' | 'closed';
  memberCount: number;
  progressPct: number;
  nextMilestone: { label: string; amountNeeded: number } | null;
  yourOrderId?: string;
  yourSoloCost?: number;
  yourPooledCost?: number;
  yourSavings?: number;
  yourInvoice?: Invoice;
}

export interface PoolOperatorView extends Omit<PoolView, 'yourOrderId' | 'yourSoloCost' | 'yourPooledCost' | 'yourSavings' | 'yourInvoice'> {
  orders: { businessName: string; lines: OrderLine[]; soloCost: number; pooledCost: number }[];
  subtotal: number;
  purchaseOrder?: PurchaseOrder;
  invoices?: Invoice[];
}

export interface ScrapOffer {
  matchId: string;
  role: 'holder' | 'requester';
  material: string;
  estQty: number;
  unit: string;
  readyInDays: number;
  suggestedPricePerUnit: number;
  counterpartyLabel: string;
  distanceMiles: number;
  aiReasoning: string;
  /** Show the Granite label only when this is 'granite'. */
  reasoningBy: 'granite' | 'template';
  status: 'pending' | 'accepted' | 'declined';
  /** Present once accepted. */
  deal?: ScrapDeal;
}

export interface ScrapDeal {
  counterpartyName: string;
  counterpartyEmail: string;
  pickupFrom: string;
  total: number;
}

export interface Notification {
  id: string;
  businessId: string;
  kind: 'pool_grew' | 'pool_closed' | 'charge_failed' | 'scrap_offer' | 'scrap_requested' | 'scrap_accepted' | 'scrap_declined';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  poolId?: string;
  matchId?: string;
}

export interface NotificationFeed {
  unreadCount: number;
  notifications: Notification[];
}

export interface Metrics {
  dollarsSaved: number;
  dollarsSavedClosed: number;
  dollarsSavedProjected: number;
  deliveriesAvoided: number;
  lbsDiverted: number;
  dollarsKeptInMichigan: number;
}

// ── Request/response wrappers ─────────────────────────────────────────────────

export interface CreateOrderResponse {
  order: Order;
  pool: PoolView;
  scrapOffers: ScrapOffer[];
  parsedBy: Order['parsedBy'];
}

export interface ClosePoolResponse {
  purchaseOrder: PurchaseOrder;
  invoices: Invoice[];
}

export type OrderWithPool = Order & { pool: PoolView };
