/**
 * Pricing verification script — proves solo vs pooled costs on seed data
 * match a line-by-line hand calculation.
 *
 * Run: npx tsx scripts/check-pricing.ts
 *
 * Hand calculation (seed state: 2 orders in Detroit pool):
 *
 * Supplier: Motor City Restaurant Supply
 *   deliveryFee = $45.00   freeDeliveryMinimum = $350.00
 *
 * Catalog relevant to this pool:
 *   PTOWEL-CS  $22.00 base   tier: qty≥5 → $19.50
 *   CUPS8-CS   $26.00 base   tier: qty≥3 → $23.50
 *   NAPKIN-CS  $14.00 base   tier: qty≥4 → $12.50
 *   CLEANER-GL  $9.50 base   tier: qty≥6 →  $8.25
 *
 * Order A — Corktown Coffee (5×PTOWEL + 3×CUPS8 + 2×NAPKIN)
 * Order B — Midtown Grind   (3×PTOWEL + 2×CLEANER)
 *
 * Pool combined qty:
 *   PTOWEL-CS  = 5+3 = 8  → tier reached (≥5) → $19.50
 *   CUPS8-CS   = 3        → tier reached (≥3) → $23.50
 *   NAPKIN-CS  = 2        → no tier (≥4 needed) → $14.00
 *   CLEANER-GL = 2        → no tier (≥6 needed) →  $9.50
 *
 * ── Order A ──
 *   Solo subtotal (own qty earns towel ≥5 and cup ≥3 tiers alone):
 *     5×$19.50 + 3×$23.50 + 2×$14 = $97.50 + $70.50 + $28 = $196.00
 *   Solo delivery: $196 < $350 → $45.00
 *   Solo cost: $241.00
 *
 *   Pooled subtotal A: 5×$19.50 + 3×$23.50 + 2×$14.00
 *                     = $97.50 + $70.50 + $28.00 = $196.00
 *   Pool pooled subtotal: $196.00 + $77.50 = $273.50
 *   Delivery share A: $45 × (196.00/273.50) = $45 × 0.71647… = $32.24
 *   Pooled cost A: $196.00 + $32.25 = $228.25
 *   Savings A: $241.00 − $228.25 = $12.75 (shared delivery)
 *
 * ── Order B ──
 *   Solo subtotal: 3×$22 + 2×$9.50 = $66 + $19 = $85.00
 *   Solo delivery: $85 < $350 → $45.00
 *   Solo cost: $130.00
 *
 *   Pooled subtotal B: 3×$19.50 + 2×$9.50 = $58.50 + $19.00 = $77.50
 *   Delivery share B: $45 × (77.50/273.50) = $45 × 0.28338… = $12.75
 *   Pooled cost B: $77.50 + $12.75 = $90.25
 *   Savings B: $130.00 − $90.25 = $39.75
 *
 * ── Pool progress ──
 *   progressPct: (273.50 / 350) × 100 = 78.14%
 *   nextMilestone candidates:
 *     • Free delivery: need $350 − $273.50 = $76.50
 *     • NAPKIN-CS next tier (≥4): gap 2 × $14.00 = $28.00  ← smallest
 *     • CLEANER-GL next tier (≥6): gap 4 × $9.50 = $38.00
 *   → business view (default): free delivery only, amountNeeded = $76.50
 *     (tier hints would reveal other members' items: spec §6 privacy rule)
 *   → operator view (includeTierHints): NAPKIN-CS tier, amountNeeded = $28.00
 *
 * ── After adding live Greektown order (3×CUPS8 + 3×CLEANER) ──
 *   Pool combined: PTOWEL 8, CUPS8 6, NAPKIN 2, CLEANER 5
 *   CUPS8 at 6: tier ≥3 → $23.50 (already there)
 *   CLEANER at 5: no tier (≥6) → $9.50
 *   Pooled subtotal (all 3 orders):
 *     A: 5×19.50 + 3×23.50 + 2×14.00 = 196.00
 *     B: 3×19.50 + 2×9.50  = 77.50
 *     C: 3×23.50 + 3×9.50  = 70.50 + 28.50 = 99.00
 *     Pool total = $372.50  ≥ $350  → FREE DELIVERY ✓
 */

// ── load the services under test ──────────────────────────────────────────────

import { db, reseed } from '../src/models/store';
import { calcOrderCosts, calcProgress, poolSubtotal } from '../src/services/pricing';

// ── helpers ───────────────────────────────────────────────────────────────────

type Check = { label: string; got: number; want: number; pass: boolean };
const checks: Check[] = [];

function expect(label: string, got: number, want: number, toleranceCents = 1): void {
  const pass = Math.abs(got - want) <= toleranceCents / 100;
  checks.push({ label, got, want, pass });
}

function expectPct(label: string, got: number, want: number): void {
  const pass = Math.abs(got - want) <= 0.1; // 0.1 percentage point tolerance
  checks.push({ label, got, want, pass });
}

// ── run ───────────────────────────────────────────────────────────────────────

reseed();

const supplier = db.suppliers.find((s) => s.id === 'sup-detroit-01')!;
const pool     = db.pools.find((p) => p.id === 'pool-detroit-01')!;
const orderA   = db.orders.find((o) => o.id === 'ord-cafe1-seed-01')!;
const orderB   = db.orders.find((o) => o.id === 'ord-cafe2-seed-01')!;
const allOrders = [orderA, orderB];

// ── pool subtotal ─────────────────────────────────────────────────────────────

const pSub = poolSubtotal(allOrders, supplier);
expect('pool pooled subtotal', pSub, 273.50);

// ── Order A costs ─────────────────────────────────────────────────────────────

const costsA = calcOrderCosts(orderA, allOrders, supplier);
expect('Order A solo subtotal',    costsA.soloSubtotal,   196.00); // own qty already earns towel + cup tiers
expect('Order A solo cost',        costsA.soloCost,        241.00);
expect('Order A pooled subtotal',  costsA.pooledSubtotal,  196.00);
expect('Order A pooled cost',      costsA.pooledCost,      228.25);
expect('Order A savings',          costsA.savings,          12.75);

// ── Order B costs ─────────────────────────────────────────────────────────────

const costsB = calcOrderCosts(orderB, allOrders, supplier);
expect('Order B solo subtotal',    costsB.soloSubtotal,    85.00);
expect('Order B solo cost',        costsB.soloCost,        130.00);
expect('Order B pooled subtotal',  costsB.pooledSubtotal,   77.50);
expect('Order B pooled cost',      costsB.pooledCost,       90.25);
expect('Order B savings',          costsB.savings,          39.75);

// ── pool progress ─────────────────────────────────────────────────────────────

const progress = calcProgress(allOrders, supplier);
expectPct('progressPct before live order',  progress.progressPct,  78.14);

// Business view: free delivery only ($76.50), never another member's item
expect(
  'viewer nextMilestone amountNeeded (free delivery)',
  progress.nextMilestone?.amountNeeded ?? 0,
  76.50,
);
checks.push({
  label: 'viewer nextMilestone names no item',
  got: /napkin|towel|cup|cleaner/i.test(progress.nextMilestone?.label ?? '') ? 1 : 0,
  want: 0,
  pass: !/napkin|towel|cup|cleaner/i.test(progress.nextMilestone?.label ?? ''),
});

// Operator view: smallest milestone is the NAPKIN tier ($28.00)
const opProgress = calcProgress(allOrders, supplier, { includeTierHints: true });
expect(
  'operator nextMilestone amountNeeded (NAPKIN tier)',
  opProgress.nextMilestone?.amountNeeded ?? 0,
  28.00,
);

// ── live Greektown order crosses free delivery ────────────────────────────────

const greektownOrder = {
  id: 'ord-greektown-live',
  businessId: 'biz-cafe-greektown-01',
  supplierId: 'sup-detroit-01',
  rawText: '3 cases cups and 3 gallons cleaner',
  lines: [
    { sku: 'CUPS8-CS',   name: '8 oz Cups (case/1000)',        qty: 3, unit: 'case',   soloUnitPrice: 26.00 },
    { sku: 'CLEANER-GL', name: 'All-Purpose Cleaner (gallon)', qty: 3, unit: 'gallon', soloUnitPrice: 9.50  },
  ],
  poolId: 'pool-detroit-01',
  parsedBy: 'fallback' as const,
  status: 'pooled' as const,
  createdAt: new Date().toISOString(),
};

const allThree = [orderA, orderB, greektownOrder];
const pSubAfter = poolSubtotal(allThree, supplier);
expect('pool pooled subtotal after live order', pSubAfter, 372.50);

const progressAfter = calcProgress(allThree, supplier);
expectPct('progressPct after live order', progressAfter.progressPct, 100.00);

// Greektown's pooled cost: free delivery → pooledCost = pooledSubtotal
const costsC = calcOrderCosts(greektownOrder, allThree, supplier);
expect('Greektown pooled subtotal', costsC.pooledSubtotal, 99.00);
expect('Greektown pooled delivery', costsC.pooledCost - costsC.pooledSubtotal, 0.00);

// ── print results ─────────────────────────────────────────────────────────────

const passed = checks.filter((c) => c.pass).length;
const failed = checks.filter((c) => !c.pass);

console.log('\n══ SupplyMash pricing check ════════════════════════════════════\n');

for (const c of checks) {
  const mark = c.pass ? '✓' : '✗';
  const got  = c.got.toFixed(2);
  const want = c.want.toFixed(2);
  console.log(`  ${mark}  ${c.label.padEnd(46)} got=${got.padStart(7)}  want=${want.padStart(7)}`);
}

console.log(`\n  ${passed}/${checks.length} passed`);

if (failed.length > 0) {
  console.error('\nFailed checks:');
  for (const c of failed) {
    console.error(`  ✗  ${c.label}: got ${c.got.toFixed(4)}, want ${c.want.toFixed(4)}`);
  }
  process.exit(1);
}

console.log('\n  All checks passed ✓\n');
