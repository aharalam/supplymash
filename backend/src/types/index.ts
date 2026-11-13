// Core domain types for SupplyMash

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  location: Location;
  contactEmail: string;
  description: string;
  enrolledFeatures: Feature[];
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
}

export type ListingType = 'offering' | 'requesting';
export type ListingStatus = 'active' | 'matched' | 'fulfilled' | 'expired';

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
}

export type MatchStatus = 'pending' | 'accepted' | 'declined' | 'completed';
