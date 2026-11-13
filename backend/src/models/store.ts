/**
 * In-memory data store for MVP.
 * Replace with IBM Cloudant or another database for production.
 *
 * §10 seed data — fictional businesses, real Michigan places.
 *
 * FREE-DELIVERY MATH (Detroit supplier, threshold $350, spec §7):
 *   Progress uses the POOLED, bulk-tier-priced subtotal (what the supplier bills).
 *   Pre-seeded orders: $273.50 pooled ($301.00 at list)  →  78.1% of $350
 *   + live Greektown order (3 cups + 3 cleaner)  →  $372.50 pooled  →  106.4% ✓
 */
import { v4 as uuidv4 } from 'uuid';
import {
  Business,
  ResourceListing,
  OrderPool,
  Warehouse,
  Match,
  Supplier,
  Order,
  Pool,
  Notification,
} from '../types';

// ── Mutable collections ───────────────────────────────────────────────────────

export const db = {
  businesses: [] as Business[],
  listings: [] as ResourceListing[],
  orderPools: [] as OrderPool[],
  warehouses: [] as Warehouse[],
  matches: [] as Match[],
  // §6 order-first additions
  suppliers: [] as Supplier[],
  orders: [] as Order[],
  pools: [] as Pool[],
  notifications: [] as Notification[],
};

// ── Stable IDs (fixed strings so demo/reset produces the same IDs) ────────────

const SUPPLIER_DETROIT_ID  = 'sup-detroit-01';
const SUPPLIER_GR_ID       = 'sup-gr-lumber-01';
const SUPPLIER_LANSING_ID  = 'sup-lansing-farm-01';

// Detroit cafés
const BIZ_CAFE1_ID  = 'biz-cafe-corktown-01';
const BIZ_CAFE2_ID  = 'biz-cafe-midtown-01';
const BIZ_CAFE3_ID  = 'biz-cafe-greektown-01';
// Grand Rapids furniture maker
const BIZ_FURNITURE_ID = 'biz-furniture-gr-01';
// Detroit contractor
const BIZ_CONTRACTOR_ID = 'biz-contractor-det-01';
// Kent County farm (near Grand Rapids)
const BIZ_FARM_KENT_ID = 'biz-farm-kent-01';
// Washtenaw County farm (near Ann Arbor)
const BIZ_FARM_WASHTENAW_ID = 'biz-farm-washtenaw-01';
// Legacy three businesses
const BIZ_LUMBER_CO_ID   = 'biz-lumber-co-01';
const BIZ_SUNRISE_ID     = 'biz-sunrise-farm-01';
const BIZ_MCBUILDERS_ID  = 'biz-mc-builders-01';

// Detroit supplier catalog SKUs
const SKU_PTOWEL  = 'PTOWEL-CS';   // paper towels, case/12 rolls
const SKU_NAPKIN  = 'NAPKIN-CS';   // napkins, case/500
const SKU_CUPS8   = 'CUPS8-CS';    // 8 oz cups, case/1000
const SKU_CLEANER = 'CLEANER-GL';  // all-purpose cleaner, gallon

// Pool / order IDs
const POOL_DETROIT_ID   = 'pool-detroit-01';
const ORDER_CAFE1_ID    = 'ord-cafe1-seed-01';
const ORDER_CAFE2_ID    = 'ord-cafe2-seed-01';

// Farm scrap listing IDs
const LISTING_FARM_KENT_ID     = 'lst-farm-kent-wood-01';
const LISTING_FARM_WASHTENAW_ID = 'lst-farm-wash-wood-01';

// ── reseed() — called at startup and by POST /api/demo/reset ──────────────────

export function reseed(): void {
  // Clear all collections
  db.businesses.length = 0;
  db.listings.length   = 0;
  db.orderPools.length = 0;
  db.warehouses.length = 0;
  db.matches.length    = 0;
  db.suppliers.length  = 0;
  db.orders.length     = 0;
  db.pools.length      = 0;
  db.notifications.length = 0;

  const now = new Date().toISOString();
  const deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days out

  // ── Suppliers ───────────────────────────────────────────────────────────────

  db.suppliers.push(
    // 1. Detroit restaurant and janitorial supplier (Michigan-based)
    {
      id: SUPPLIER_DETROIT_ID,
      name: 'Motor City Restaurant Supply',
      location: { city: 'Detroit', state: 'MI', zipCode: '48207', lat: 42.3534, lng: -83.0180 },
      michiganBased: true,
      deliveryFee: 45.00,
      freeDeliveryMinimum: 350.00,
      catalog: [
        {
          sku: SKU_PTOWEL,
          name: 'Paper Towels (case/12 rolls)',
          aliases: ['paper towel', 'paper towels', 'towel', 'towels', 'pt', 'bounty', 'paper roll'],
          category: 'paper_goods',
          unit: 'case',
          unitPrice: 22.00,
          bulkTiers: [{ minQty: 5, unitPrice: 19.50 }],
          weightLbsPerUnit: 12,
        },
        {
          sku: SKU_NAPKIN,
          name: 'Napkins (case/500)',
          aliases: ['napkin', 'napkins', 'paper napkin', 'table napkin'],
          category: 'paper_goods',
          unit: 'case',
          unitPrice: 14.00,
          bulkTiers: [{ minQty: 4, unitPrice: 12.50 }],
          weightLbsPerUnit: 8,
        },
        {
          sku: SKU_CUPS8,
          name: '8 oz Cups (case/1000)',
          aliases: ['cup', 'cups', '8oz cup', '8 oz cup', 'paper cup', 'disposable cup'],
          category: 'paper_goods',
          unit: 'case',
          unitPrice: 26.00,
          bulkTiers: [{ minQty: 3, unitPrice: 23.50 }],
          weightLbsPerUnit: 10,
        },
        {
          sku: SKU_CLEANER,
          name: 'All-Purpose Cleaner (gallon)',
          aliases: ['cleaner', 'all purpose cleaner', 'cleaner gallon', 'janitorial cleaner', 'sanitizer'],
          category: 'cleaning',
          unit: 'gallon',
          unitPrice: 9.50,
          bulkTiers: [{ minQty: 6, unitPrice: 8.25 }],
          weightLbsPerUnit: 9,
        },
      ],
    },

    // 2. Grand Rapids lumber yard (Michigan-based)
    {
      id: SUPPLIER_GR_ID,
      name: 'West Michigan Lumber Yard',
      location: { city: 'Grand Rapids', state: 'MI', zipCode: '49503', lat: 42.9634, lng: -85.6681 },
      michiganBased: true,
      deliveryFee: 65.00,
      freeDeliveryMinimum: 500.00,
      catalog: [
        {
          sku: 'STUD2X4-8',
          name: '2x4 Stud 8 ft',
          aliases: ['2x4', '2 by 4', 'stud', '8 foot stud', '2x4 stud'],
          category: 'lumber',
          unit: 'piece',
          unitPrice: 5.25,
          bulkTiers: [{ minQty: 50, unitPrice: 4.75 }, { minQty: 200, unitPrice: 4.25 }],
          weightLbsPerUnit: 9,
        },
        {
          sku: 'PLY34-4X8',
          name: '3/4 in Plywood Sheet 4x8',
          aliases: ['plywood', '3/4 plywood', 'ply', 'sheet', '4x8 plywood'],
          category: 'lumber',
          unit: 'sheet',
          unitPrice: 42.00,
          bulkTiers: [{ minQty: 20, unitPrice: 38.00 }, { minQty: 50, unitPrice: 35.00 }],
          weightLbsPerUnit: 60,
        },
        {
          sku: 'OSB716-4X8',
          name: '7/16 in OSB Sheet 4x8',
          aliases: ['osb', 'oriented strand board', 'sheathing', 'osb sheet'],
          category: 'lumber',
          unit: 'sheet',
          unitPrice: 18.50,
          bulkTiers: [{ minQty: 20, unitPrice: 16.75 }],
          weightLbsPerUnit: 46,
        },
      ],
    },

    // 3. National farm-supply chain, Lansing branch (not Michigan-based, for contrast)
    {
      id: SUPPLIER_LANSING_ID,
      name: 'AgriSource Lansing',
      location: { city: 'Lansing', state: 'MI', zipCode: '48906', lat: 42.7325, lng: -84.5555 },
      michiganBased: false,
      deliveryFee: 55.00,
      freeDeliveryMinimum: 350.00,
      catalog: [
        {
          sku: 'FEED-CORN-50',
          name: 'Corn Feed (50 lb bag)',
          aliases: ['corn feed', 'corn', 'feed corn', '50lb corn'],
          category: 'animal_feed',
          unit: 'bag',
          unitPrice: 14.75,
          bulkTiers: [{ minQty: 10, unitPrice: 13.50 }],
          weightLbsPerUnit: 50,
        },
        {
          sku: 'FERT-10-10-10',
          name: 'Fertilizer 10-10-10 (50 lb bag)',
          aliases: ['fertilizer', 'fert', '10-10-10', 'balanced fertilizer'],
          category: 'fertilizer',
          unit: 'bag',
          unitPrice: 22.00,
          bulkTiers: [{ minQty: 5, unitPrice: 20.00 }],
          weightLbsPerUnit: 50,
        },
        {
          sku: 'BEDDINGPLT-40',
          name: 'Wood Pellet Bedding (40 lb bag)',
          aliases: ['wood pellet', 'bedding', 'animal bedding', 'wood pellet bedding', 'pellet bedding'],
          category: 'bedding',
          unit: 'bag',
          unitPrice: 11.25,
          bulkTiers: [{ minQty: 8, unitPrice: 10.00 }],
          weightLbsPerUnit: 40,
        },
      ],
    },
  );

  // ── Businesses ───────────────────────────────────────────────────────────────

  db.businesses.push(
    // ── Legacy three (kept) ──────────────────────────────────────────────────
    {
      id: BIZ_LUMBER_CO_ID,
      name: 'Great Lakes Lumber Co.',
      type: 'factory',
      location: { city: 'Detroit', state: 'MI', zipCode: '48201', lat: 42.3519, lng: -83.0607 },
      contactEmail: 'info@gllumber.example.com',
      description: 'Lumber processing facility with significant wood chip byproduct.',
      enrolledFeatures: ['recycling_exchange', 'order_pooling'],
      usualSupplierIds: [SUPPLIER_DETROIT_ID],
      createdAt: now,
    },
    {
      id: BIZ_SUNRISE_ID,
      name: 'Sunrise Organic Farm',
      type: 'farm',
      location: { city: 'Ann Arbor', state: 'MI', zipCode: '48103', lat: 42.2808, lng: -83.7430 },
      contactEmail: 'info@sunrisefarm.example.com',
      description: 'Small organic farm seeking wood chips for mulch and bedding.',
      enrolledFeatures: ['recycling_exchange', 'order_pooling', 'micro_warehouse'],
      usualSupplierIds: [SUPPLIER_LANSING_ID],
      createdAt: now,
    },
    {
      id: BIZ_MCBUILDERS_ID,
      name: 'Motor City Builders',
      type: 'construction',
      location: { city: 'Detroit', state: 'MI', zipCode: '48202', lat: 42.3645, lng: -83.0767 },
      contactEmail: 'ops@motorcitybuilders.example.com',
      description: 'General contractor generating scrap metal and reusable lumber.',
      enrolledFeatures: ['recycling_exchange', 'micro_warehouse'],
      usualSupplierIds: [SUPPLIER_GR_ID],
      createdAt: now,
    },

    // ── 3 Detroit cafés ──────────────────────────────────────────────────────
    {
      id: BIZ_CAFE1_ID,
      name: 'Corktown Coffee',
      type: 'restaurant',
      location: { city: 'Detroit', state: 'MI', zipCode: '48216', lat: 42.3296, lng: -83.0609 },
      contactEmail: 'orders@corktowncoffee.example.com',
      description: 'Neighborhood café in Corktown serving specialty coffee and baked goods.',
      enrolledFeatures: ['order_pooling'],
      usualSupplierIds: [SUPPLIER_DETROIT_ID],
      createdAt: now,
    },
    {
      id: BIZ_CAFE2_ID,
      name: 'Midtown Grind',
      type: 'restaurant',
      location: { city: 'Detroit', state: 'MI', zipCode: '48201', lat: 42.3534, lng: -83.0635 },
      contactEmail: 'ops@midtowngrind.example.com',
      description: 'Busy café near Wayne State — high volume of cups and napkins weekly.',
      enrolledFeatures: ['order_pooling'],
      usualSupplierIds: [SUPPLIER_DETROIT_ID],
      createdAt: now,
    },
    {
      id: BIZ_CAFE3_ID,
      name: 'Greek Town Espresso',
      type: 'restaurant',
      location: { city: 'Detroit', state: 'MI', zipCode: '48226', lat: 42.3295, lng: -83.0414 },
      contactEmail: 'hello@gtespresso.example.com',
      description: 'Espresso bar in Greektown — this is the live-demo business.',
      enrolledFeatures: ['order_pooling'],
      usualSupplierIds: [SUPPLIER_DETROIT_ID],
      createdAt: now,
    },

    // ── Furniture maker (Grand Rapids) ───────────────────────────────────────
    {
      id: BIZ_FURNITURE_ID,
      name: 'Lakeshore Furniture Works',
      type: 'manufacturer',
      location: { city: 'Grand Rapids', state: 'MI', zipCode: '49505', lat: 42.9887, lng: -85.6679 },
      contactEmail: 'orders@lakeshorefurniture.example.com',
      description: 'Custom furniture maker producing hardwood offcuts and sawdust weekly.',
      enrolledFeatures: ['order_pooling', 'recycling_exchange'],
      usualSupplierIds: [SUPPLIER_GR_ID],
      createdAt: now,
    },

    // ── Detroit contractor ───────────────────────────────────────────────────
    {
      id: BIZ_CONTRACTOR_ID,
      name: 'Rivertown Construction',
      type: 'construction',
      location: { city: 'Detroit', state: 'MI', zipCode: '48207', lat: 42.3447, lng: -82.9969 },
      contactEmail: 'supply@rivertown.example.com',
      description: 'Residential and light-commercial contractor, east Detroit.',
      enrolledFeatures: ['order_pooling', 'recycling_exchange'],
      usualSupplierIds: [SUPPLIER_GR_ID],
      createdAt: now,
    },

    // ── Kent County farm (near Grand Rapids, within 60 mi of lumber buyers) ─
    {
      id: BIZ_FARM_KENT_ID,
      name: 'Kent County Pastures',
      type: 'farm',
      location: { city: 'Rockford', state: 'MI', zipCode: '49341', lat: 43.1203, lng: -85.5600 },
      contactEmail: 'info@kentcountypastures.example.com',
      description: 'Family farm raising goats and chickens; needs wood chip bedding year-round.',
      enrolledFeatures: ['recycling_exchange', 'order_pooling'],
      usualSupplierIds: [SUPPLIER_LANSING_ID],
      createdAt: now,
    },

    // ── Washtenaw County farm (near Ann Arbor, within 60 mi of Detroit lumber) ─
    {
      id: BIZ_FARM_WASHTENAW_ID,
      name: 'Washtenaw Roots Farm',
      type: 'farm',
      location: { city: 'Dexter', state: 'MI', zipCode: '48130', lat: 42.3611, lng: -83.8869 },
      contactEmail: 'orders@washtenawroots.example.com',
      description: 'Vegetable and livestock farm seeking wood chip mulch and offcuts.',
      enrolledFeatures: ['recycling_exchange', 'order_pooling'],
      usualSupplierIds: [SUPPLIER_LANSING_ID],
      createdAt: now,
    },
  );

  // ── Legacy listings (recycling exchange, unchanged) ──────────────────────────

  db.listings.push(
    {
      id: uuidv4(),
      businessId: BIZ_LUMBER_CO_ID,
      businessName: 'Great Lakes Lumber Co.',
      type: 'offering',
      materialCategory: 'wood_lumber',
      title: 'Excess wood chips — 2 tons available weekly',
      description: 'Fine wood chips, kiln dried, suitable for animal bedding, mulch, or biomass.',
      quantity: 2000,
      unit: 'lbs',
      pricePerUnit: 0.05,
      location: { city: 'Detroit', state: 'MI', zipCode: '48201', lat: 42.3519, lng: -83.0607 },
      status: 'active',
      createdAt: now,
    },
    {
      id: uuidv4(),
      businessId: BIZ_SUNRISE_ID,
      businessName: 'Sunrise Organic Farm',
      type: 'requesting',
      materialCategory: 'wood_lumber',
      title: 'Seeking wood chips for animal bedding',
      description: 'Looking for consistent supply of clean wood chips, 500–2000 lbs per week.',
      quantity: 1000,
      unit: 'lbs',
      pricePerUnit: 0.08,
      location: { city: 'Ann Arbor', state: 'MI', zipCode: '48103', lat: 42.2808, lng: -83.7430 },
      status: 'active',
      createdAt: now,
    },

    // ── 2 farm scrap requesting listings (§10 requirement) ───────────────────
    // Kent County farm wants wood chips / offcuts from nearby lumber buyers
    {
      id: LISTING_FARM_KENT_ID,
      businessId: BIZ_FARM_KENT_ID,
      businessName: 'Kent County Pastures',
      type: 'requesting',
      materialCategory: 'wood_lumber',
      title: 'Wanted: wood chip offcuts for goat and chicken bedding',
      description:
        'We need 500–1500 lbs of clean wood chips or offcuts weekly for animal bedding. ' +
        'Located in Rockford, can arrange pickup.',
      quantity: 1000,
      unit: 'lbs',
      pricePerUnit: 0.07,
      location: { city: 'Rockford', state: 'MI', zipCode: '49341', lat: 43.1203, lng: -85.5600 },
      status: 'active',
      createdAt: now,
    },
    // Washtenaw farm wants wood chip mulch from Detroit / Ann Arbor area lumber activity
    {
      id: LISTING_FARM_WASHTENAW_ID,
      businessId: BIZ_FARM_WASHTENAW_ID,
      businessName: 'Washtenaw Roots Farm',
      type: 'requesting',
      materialCategory: 'wood_lumber',
      title: 'Seeking hardwood offcuts and sawdust for mulching',
      description:
        'Looking for hardwood offcuts or sawdust for vegetable row mulching and livestock bedding. ' +
        '500–2000 lbs, Dexter MI, we pick up.',
      quantity: 1500,
      unit: 'lbs',
      pricePerUnit: 0.06,
      location: { city: 'Dexter', state: 'MI', zipCode: '48130', lat: 42.3611, lng: -83.8869 },
      status: 'active',
      createdAt: now,
    },
  );

  // ── Open Detroit pool with 2 pre-parsed orders ───────────────────────────────
  //
  // Pool subtotal before the live café order:
  //   Order A (Corktown Coffee):
  //     5 × PTOWEL-CS  @ $22.00 = $110.00
  //     3 × CUPS8-CS   @ $26.00 =  $78.00
  //     2 × NAPKIN-CS  @ $14.00 =  $28.00
  //     subtotal A = $216.00
  //
  //   Order B (Midtown Grind):
  //     3 × PTOWEL-CS  @ $22.00 =  $66.00
  //     2 × CLEANER-GL @ $9.50  =  $19.00
  //     subtotal B = $85.00
  //
  //   List-price subtotal = $301.00. Pooled (bulk-tier) subtotal = $273.50
  //   (paper towels 8 ≥ 5 → $19.50; cups 3 ≥ 3 → $23.50)  →  273.50/350 = 78.1%
  //
  // The live demo order (Greek Town Espresso), 3 × CUPS8-CS + 3 × CLEANER-GL:
  //   pooled subtotal becomes $372.50  →  106.4% of $350  ✓  (free delivery unlocked)

  db.pools.push({
    id: POOL_DETROIT_ID,
    supplierId: SUPPLIER_DETROIT_ID,
    orderIds: [ORDER_CAFE1_ID, ORDER_CAFE2_ID],
    deadline,
    status: 'open',
  });

  db.orders.push(
    // Order A — Corktown Coffee
    {
      id: ORDER_CAFE1_ID,
      businessId: BIZ_CAFE1_ID,
      supplierId: SUPPLIER_DETROIT_ID,
      rawText:
        '5 cases paper towels, 3 cases cups, 2 cases napkins please — usual weekly order',
      lines: [
        { sku: SKU_PTOWEL, name: 'Paper Towels (case/12 rolls)', qty: 5, unit: 'case', soloUnitPrice: 22.00 },
        { sku: SKU_CUPS8,  name: '8 oz Cups (case/1000)',        qty: 3, unit: 'case', soloUnitPrice: 26.00 },
        { sku: SKU_NAPKIN, name: 'Napkins (case/500)',           qty: 2, unit: 'case', soloUnitPrice: 14.00 },
      ],
      poolId: POOL_DETROIT_ID,
      parsedBy: 'fallback',
      status: 'pooled',
      createdAt: now,
    },

    // Order B — Midtown Grind
    {
      id: ORDER_CAFE2_ID,
      businessId: BIZ_CAFE2_ID,
      supplierId: SUPPLIER_DETROIT_ID,
      rawText:
        'need 3 cases towels and 2 gallons cleaner',
      lines: [
        { sku: SKU_PTOWEL,  name: 'Paper Towels (case/12 rolls)',  qty: 3, unit: 'case',   soloUnitPrice: 22.00 },
        { sku: SKU_CLEANER, name: 'All-Purpose Cleaner (gallon)',  qty: 2, unit: 'gallon', soloUnitPrice: 9.50  },
      ],
      poolId: POOL_DETROIT_ID,
      parsedBy: 'fallback',
      status: 'pooled',
      createdAt: now,
    },
  );

  // ── Shared micro-warehouses (legacy page; pitched as the next AI feature) ────
  db.warehouses.push(
    {
      id: 'wh-eastern-market-01',
      name: 'Eastern Market Cold Room',
      location: { city: 'Detroit', state: 'MI', zipCode: '48207', lat: 42.3478, lng: -83.0416 },
      totalSqFt: 1200,
      availableSqFt: 750,
      features: ['refrigerated', 'drive_in'],
      pricePerSqFtPerMonth: 1.35,
      members: [
        { businessId: BIZ_CAFE1_ID, businessName: 'Corktown Coffee', sqFtLeased: 450, leaseStartDate: '2026-10-01', leaseEndDate: '2027-03-31' },
      ],
      status: 'partial',
      createdAt: now,
    },
    {
      id: 'wh-gr-westside-01',
      name: 'Westside Grand Rapids Shop Bay',
      location: { city: 'Grand Rapids', state: 'MI', zipCode: '49504', lat: 42.9706, lng: -85.6950 },
      totalSqFt: 2400,
      availableSqFt: 2400,
      features: ['heavy_equipment', 'drive_in'],
      pricePerSqFtPerMonth: 0.85,
      members: [],
      status: 'available',
      createdAt: now,
    },
  );
}

// ── Seed on startup ───────────────────────────────────────────────────────────
reseed();
