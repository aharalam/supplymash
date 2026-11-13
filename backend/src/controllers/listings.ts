import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/store';
import { ResourceListing } from '../types';

export const getListings = (req: Request, res: Response): void => {
  const { type, materialCategory, status } = req.query;
  let results = db.listings;
  if (type) results = results.filter((l) => l.type === type);
  if (materialCategory) results = results.filter((l) => l.materialCategory === materialCategory);
  if (status) results = results.filter((l) => l.status === status);
  else results = results.filter((l) => l.status === 'active');
  res.json(results);
};

export const getListingById = (req: Request, res: Response): void => {
  const listing = db.listings.find((l) => l.id === req.params.id);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }
  res.json(listing);
};

export const createListing = (req: Request, res: Response): void => {
  const body = req.body as Partial<ResourceListing>;
  if (!body.businessId || !body.type || !body.materialCategory || !body.title) {
    res.status(400).json({ error: 'businessId, type, materialCategory, and title are required' });
    return;
  }
  const business = db.businesses.find((b) => b.id === body.businessId);
  const listing: ResourceListing = {
    id: uuidv4(),
    businessId: body.businessId,
    businessName: business?.name ?? 'Unknown',
    type: body.type,
    materialCategory: body.materialCategory,
    title: body.title,
    description: body.description ?? '',
    quantity: body.quantity ?? 0,
    unit: body.unit ?? 'units',
    pricePerUnit: body.pricePerUnit ?? 0,
    location: body.location ?? { city: '', state: '', zipCode: '' },
    status: 'active',
    createdAt: new Date().toISOString(),
    expiresAt: body.expiresAt,
  };
  db.listings.push(listing);
  res.status(201).json(listing);
};

export const updateListing = (req: Request, res: Response): void => {
  const idx = db.listings.findIndex((l) => l.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }
  db.listings[idx] = { ...db.listings[idx], ...req.body, id: req.params.id };
  res.json(db.listings[idx]);
};

export const deleteListing = (req: Request, res: Response): void => {
  const idx = db.listings.findIndex((l) => l.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }
  db.listings.splice(idx, 1);
  res.status(204).send();
};
