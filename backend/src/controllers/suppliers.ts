import { Request, Response } from 'express';
import { Supplier } from '../types';

// Stub seed data – realistic shape per §9 / §10
const STUB_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-001',
    name: 'Motor City Restaurant Supply',
    location: { city: 'Detroit', state: 'MI', zipCode: '48201', lat: 42.3314, lng: -83.0458 },
    michiganBased: true,
    deliveryFee: 45.00,
    freeDeliveryMinimum: 400.00,
    catalog: [
      { sku: 'PT-100', name: 'Paper Towels (case/12)', aliases: ['paper towels', 'towels', 'pt'], category: 'paper_goods', unit: 'case', unitPrice: 38.00, bulkTiers: [{ minQty: 5, unitPrice: 34.00 }, { minQty: 10, unitPrice: 30.00 }], weightLbsPerUnit: 22 },
      { sku: 'NP-200', name: 'Napkins (case/5000)', aliases: ['napkins', 'naps'], category: 'paper_goods', unit: 'case', unitPrice: 24.00, bulkTiers: [{ minQty: 4, unitPrice: 21.00 }], weightLbsPerUnit: 12 },
      { sku: 'CUP-12', name: '12oz Hot Cups (case/1000)', aliases: ['cups', '12oz cups', 'hot cups'], category: 'paper_goods', unit: 'case', unitPrice: 52.00, bulkTiers: [{ minQty: 3, unitPrice: 46.00 }], weightLbsPerUnit: 18 },
      { sku: 'CLN-500', name: 'All-Purpose Cleaner (gal, 4-pk)', aliases: ['cleaner', 'all purpose', 'cleaning'], category: 'cleaning', unit: 'pack', unitPrice: 29.00, bulkTiers: [{ minQty: 6, unitPrice: 25.00 }], weightLbsPerUnit: 36 },
    ],
  },
  {
    id: 'sup-002',
    name: 'West Michigan Lumber Co.',
    location: { city: 'Grand Rapids', state: 'MI', zipCode: '49503', lat: 42.9634, lng: -85.6681 },
    michiganBased: true,
    deliveryFee: 65.00,
    freeDeliveryMinimum: 500.00,
    catalog: [
      { sku: 'STD-24', name: '2x4 Stud 8ft', aliases: ['2x4', 'stud', '2 by 4', 'framing lumber'], category: 'lumber', unit: 'each', unitPrice: 5.80, bulkTiers: [{ minQty: 50, unitPrice: 5.20 }, { minQty: 100, unitPrice: 4.75 }], weightLbsPerUnit: 9 },
      { sku: 'PLY-34', name: 'Plywood 3/4" 4x8', aliases: ['plywood', 'ply', 'sheet'], category: 'lumber', unit: 'sheet', unitPrice: 42.00, bulkTiers: [{ minQty: 20, unitPrice: 37.00 }], weightLbsPerUnit: 60 },
      { sku: 'OSB-716', name: 'OSB 7/16" 4x8', aliases: ['osb', 'oriented strand', 'sheathing'], category: 'lumber', unit: 'sheet', unitPrice: 22.00, bulkTiers: [{ minQty: 20, unitPrice: 19.00 }], weightLbsPerUnit: 46 },
    ],
  },
  {
    id: 'sup-003',
    name: 'AgriSource (Lansing)',
    location: { city: 'Lansing', state: 'MI', zipCode: '48910', lat: 42.7325, lng: -84.5555 },
    michiganBased: false,
    deliveryFee: 35.00,
    freeDeliveryMinimum: 300.00,
    catalog: [
      { sku: 'FEED-50', name: 'Corn Feed 50lb bag', aliases: ['corn', 'corn feed', 'feed'], category: 'animal_feed', unit: 'bag', unitPrice: 14.50, bulkTiers: [{ minQty: 20, unitPrice: 12.75 }], weightLbsPerUnit: 50 },
      { sku: 'HAY-B', name: 'Hay Bale (large round)', aliases: ['hay', 'hay bale', 'bale'], category: 'animal_feed', unit: 'bale', unitPrice: 55.00, bulkTiers: [{ minQty: 10, unitPrice: 48.00 }], weightLbsPerUnit: 1200 },
      { sku: 'FERT-40', name: 'Fertilizer 10-10-10 40lb', aliases: ['fertilizer', 'fert', '10-10-10'], category: 'fertilizer', unit: 'bag', unitPrice: 19.00, bulkTiers: [{ minQty: 10, unitPrice: 16.50 }], weightLbsPerUnit: 40 },
      { sku: 'SEED-S', name: 'Soybean Seed 50lb', aliases: ['soybean', 'soybeans', 'seed'], category: 'seeds', unit: 'bag', unitPrice: 32.00, bulkTiers: [{ minQty: 5, unitPrice: 28.00 }], weightLbsPerUnit: 50 },
    ],
  },
];

export function getSuppliers(_req: Request, res: Response): void {
  res.json(STUB_SUPPLIERS);
}
