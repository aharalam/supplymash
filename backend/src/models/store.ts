/**
 * In-memory data store for MVP.
 * Replace with IBM Cloudant or another database for production.
 */
import { Business, ResourceListing, OrderPool, Warehouse, Match } from '../types';

export const db = {
  businesses: [] as Business[],
  listings: [] as ResourceListing[],
  orderPools: [] as OrderPool[],
  warehouses: [] as Warehouse[],
  matches: [] as Match[],
};

// Seed data for demo
import { v4 as uuidv4 } from 'uuid';

const now = new Date().toISOString();

db.businesses.push(
  {
    id: uuidv4(),
    name: 'Great Lakes Lumber Co.',
    type: 'factory',
    location: { city: 'Detroit', state: 'MI', zipCode: '48201' },
    contactEmail: 'info@gllumber.example.com',
    description: 'Lumber processing facility with significant wood chip byproduct.',
    enrolledFeatures: ['recycling_exchange', 'order_pooling'],
    createdAt: now,
  },
  {
    id: uuidv4(),
    name: 'Sunrise Organic Farm',
    type: 'farm',
    location: { city: 'Ann Arbor', state: 'MI', zipCode: '48103' },
    contactEmail: 'info@sunrisefarm.example.com',
    description: 'Small organic farm seeking wood chips for mulch and bedding.',
    enrolledFeatures: ['recycling_exchange', 'order_pooling', 'micro_warehouse'],
    createdAt: now,
  },
  {
    id: uuidv4(),
    name: 'Motor City Builders',
    type: 'construction',
    location: { city: 'Detroit', state: 'MI', zipCode: '48202' },
    contactEmail: 'ops@motorcitybuilders.example.com',
    description: 'General contractor generating scrap metal and reusable lumber.',
    enrolledFeatures: ['recycling_exchange', 'micro_warehouse'],
    createdAt: now,
  },
);

const lumberId = db.businesses[0].id;
const farmId = db.businesses[1].id;

db.listings.push(
  {
    id: uuidv4(),
    businessId: lumberId,
    businessName: 'Great Lakes Lumber Co.',
    type: 'offering',
    materialCategory: 'wood_lumber',
    title: 'Excess wood chips — 2 tons available weekly',
    description: 'Fine wood chips, kiln dried, suitable for animal bedding, mulch, or biomass.',
    quantity: 2000,
    unit: 'lbs',
    pricePerUnit: 0.05,
    location: { city: 'Detroit', state: 'MI', zipCode: '48201' },
    status: 'active',
    createdAt: now,
  },
  {
    id: uuidv4(),
    businessId: farmId,
    businessName: 'Sunrise Organic Farm',
    type: 'requesting',
    materialCategory: 'wood_lumber',
    title: 'Seeking wood chips for animal bedding',
    description: 'Looking for consistent supply of clean wood chips, 500–2000 lbs per week.',
    quantity: 1000,
    unit: 'lbs',
    pricePerUnit: 0.08,
    location: { city: 'Ann Arbor', state: 'MI', zipCode: '48103' },
    status: 'active',
    createdAt: now,
  },
);
