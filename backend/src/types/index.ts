// Core domain types for SupplyMash

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  location: Location;
  contactEmail: string;
  description: string;
  enrolledFeatures: Feature[];
  usualSupplierIds: string[];
  stripeCustomerId?: string;
  createdAt: string;
}

export type BusinessType =
  | 'factory'
  | 'farm'
  | 'construction'
  | 'restaurant'
  | 'retailer'
  | 'manufacturer'
  | 'other';

export type Feature = 'recycling_exchange' | 'order_pooling' | 'micro_warehouse';

export interface Location {
  city: string;
  state: string;
  zipCode: string;
  lat?: number;
  lng?: number;
}

// Industrial Recycling Exchange
export interface ResourceListing {
  id: string;
  businessId: string;
  businessName: string;
  type: ListingType;
  materialCategory: MaterialCategory;
  title: string;
  description: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  location: Location;
  status: ListingStatus;
  createdAt: string;
  expiresAt?: string;
  // Order-first scrap (§6): set on listings inferred from an order
  source?: 'inferred_from_order';
  orderId?: string;
  readyInDays?: number;
}

export type ListingType = 'offering' | 'requesting';
export type ListingStatus = 'active' | 'matched' | 'fulfilled' | 'expired' | 'proposed';

export type MaterialCategory =
  | 'wood_lumber'
  | 'metal_scrap'
  | 'plastic'
  | 'cardboard_paper'
  | 'food_byproduct'
  | 'textile'
  | 'electronics'
  | 'chemicals'
  | 'other';

// Local Order Pooling
export interface OrderPool {
  id: string;
  title: string;
  supplier: string;
  category: string;
  location: Location;
  members: PoolMember[];
  status: PoolStatus;
  deadline: string;
  estimatedSavings: number;
  createdAt: string;
}

export type PoolStatus = 'open' | 'forming' | 'confirmed' | 'delivered';

export interface PoolMember {
  businessId: string;
  businessName: string;
  itemDescription: string;
  quantity: number;
  unit: string;
  joinedAt: string;
}

// Shared Micro-Warehouses
export interface Warehouse {
  id: string;
  name: string;
  location: Location;
  totalSqFt: number;
  availableSqFt: number;
  features: WarehouseFeature[];
  pricePerSqFtPerMonth: number;
  members: WarehouseMember[];
  status: WarehouseStatus;
  createdAt: string;
}

export type WarehouseFeature = 'refrigerated' | 'climate_controlled' | 'heavy_equipment' | 'drive_in';
export type WarehouseStatus = 'available' | 'partial' | 'full';

export interface WarehouseMember {
  businessId: string;
  businessName: string;
  sqFtLeased: number;
  leaseStartDate: string;
  leaseEndDate: string;
}

// AI Matching
export interface Match {
  id: string;
  offeringListingId: string;
  requestingListingId: string;
  offeringBusiness: string;
  requestingBusiness: string;
  material: string;
  compatibilityScore: number;
  aiReasoning: string;
  status: MatchStatus;
  createdAt: string;
  // Order-first scrap (§6): ask the inferred holder whether to sell
  direction?: 'ask_holder';
  suggestedPricePerUnit?: number;
  reasoningBy?: 'granite' | 'template';
}

export type MatchStatus = 'pending' | 'accepted' | 'declined' | 'completed';

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
  reasoningBy: 'granite' | 'template';
  status: 'pending' | 'accepted' | 'declined';
  /** Present once accepted: who to contact and where the scrap is picked up. */
  deal?: ScrapDeal;
}

export interface ScrapDeal {
  counterpartyName: string;
  counterpartyEmail: string;
  pickupFrom: string; // holder's name and city; the requester collects
  total: number;      // estQty × suggested price
}

// ── Updates feed ──────────────────────────────────────────────────────────────

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

export interface Metrics {
  dollarsSaved: number;
  dollarsSavedClosed: number;
  dollarsSavedProjected: number;
  deliveriesAvoided: number;
  lbsDiverted: number;
  dollarsKeptInMichigan: number;
}
