/**
 * Order text → priced line items (spec §8A step 2).
 *
 * Granite first (validated JSON: SKU must be in the supplier catalog, qty > 0);
 * on timeout, bad JSON or an empty result, the alias/keyword fallback runs.
 */
import { CatalogItem, OrderLine, Supplier } from '../types';
import { graniteJSON } from './granite';
import { bestUnitPrice } from './pricing';

export interface ParseResult {
  lines: OrderLine[];
  parsedBy: 'granite' | 'fallback';
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, dozen: 12, couple: 2, few: 3, several: 3,
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Alias regex with word boundaries and an optional plural (2x4 → 2x4s). */
function aliasRe(alias: string): RegExp {
  return new RegExp(`(^|[^a-z0-9])${escapeRe(alias)}(?:e?s)?(?=$|[^a-z0-9])`, 'i');
}

function toLine(item: CatalogItem, qty: number): OrderLine {
  return { sku: item.sku, name: item.name, qty, unit: item.unit, soloUnitPrice: bestUnitPrice(item, qty) };
}

function mergeBySku(pairs: { item: CatalogItem; qty: number }[]): OrderLine[] {
  const bySku = new Map<string, { item: CatalogItem; qty: number }>();
  for (const p of pairs) {
    const prev = bySku.get(p.item.sku);
    if (prev) prev.qty += p.qty;
    else bySku.set(p.item.sku, { ...p });
  }
  return [...bySku.values()].map((p) => toLine(p.item, Math.round(p.qty * 100) / 100));
}

/** Deterministic keyword parser. Exported for tests. */
export function fallbackParse(text: string, supplier: Supplier): OrderLine[] {
  const segments = text
    .toLowerCase()
    .replace(/[&+;\n]/g, ',')
    .split(/,|\band\b|\bplus\b/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pairs: { item: CatalogItem; qty: number }[] = [];
  for (const segment of segments) {
    // Longest matching alias wins ("osb sheet" beats "sheet").
    let best: { item: CatalogItem; alias: string } | null = null;
    for (const item of supplier.catalog) {
      for (const alias of [...item.aliases, item.name.toLowerCase()]) {
        if (aliasRe(alias).test(segment) && (!best || alias.length > best.alias.length)) {
          best = { item, alias };
        }
      }
    }
    if (!best) continue;

    // Remove the product words before reading the quantity ("3/4 plywood", "8 oz cups").
    const rest = segment.replace(aliasRe(best.alias), ' ');
    const digit = rest.match(/(?:^|[^a-z0-9./])(\d+(?:\.\d+)?)(?=$|[^0-9/])/);
    let qty = digit ? Number(digit[1]) : NaN;
    if (Number.isNaN(qty)) {
      // "a dozen", "a couple": the larger number word wins over the article.
      const words = rest.split(/[^a-z]+/).filter((w) => w in NUMBER_WORDS);
      qty = words.length ? Math.max(...words.map((w) => NUMBER_WORDS[w])) : 1;
    }
    if (qty > 0) pairs.push({ item: best.item, qty });
  }
  return mergeBySku(pairs);
}

const SYSTEM = `You convert a small business's free-text supply order into catalog line items.
Reply with ONLY a JSON array, no prose: [{"sku": "<catalog sku>", "qty": <positive number>}]
Use only SKUs from the catalog. Map brand names and synonyms to the closest catalog item.
If the text gives no quantity for an item, use 1. If nothing matches, reply [].`;

function catalogPrompt(supplier: Supplier, text: string): string {
  const rows = supplier.catalog
    .map((c) => `${c.sku} | ${c.name} | unit: ${c.unit} | also called: ${c.aliases.join(', ')}`)
    .join('\n');
  return `Catalog for ${supplier.name}:\n${rows}\n\nOrder text:\n${text}`;
}

/** Validate Granite's JSON against the catalog. Returns [] if unusable. */
export function validateGraniteLines(raw: unknown, supplier: Supplier): OrderLine[] {
  if (!Array.isArray(raw)) return [];
  const pairs: { item: CatalogItem; qty: number }[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { sku, qty } = entry as { sku?: unknown; qty?: unknown };
    const item = supplier.catalog.find((c) => c.sku === sku);
    const n = typeof qty === 'string' ? Number(qty) : qty;
    if (item && typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 100_000) {
      pairs.push({ item, qty: n });
    }
  }
  return mergeBySku(pairs);
}

export async function parseOrder(text: string, supplier: Supplier): Promise<ParseResult> {
  const raw = await graniteJSON(SYSTEM, catalogPrompt(supplier, text), { maxTokens: 300 });
  const graniteLines = validateGraniteLines(raw, supplier);
  if (graniteLines.length > 0) return { lines: graniteLines, parsedBy: 'granite' };
  return { lines: fallbackParse(text, supplier), parsedBy: 'fallback' };
}
