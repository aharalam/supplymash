import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/store';
import { Business } from '../types';

export const getBusinesses = (_req: Request, res: Response): void => {
  res.json(db.businesses);
};

export const getBusinessById = (req: Request, res: Response): void => {
  const business = db.businesses.find((b) => b.id === req.params.id);
  if (!business) {
    res.status(404).json({ error: 'Business not found' });
    return;
  }
  res.json(business);
};

export const createBusiness = (req: Request, res: Response): void => {
  const { name, type, location, contactEmail, description, enrolledFeatures } = req.body as Partial<Business>;
  if (!name || !type || !location || !contactEmail) {
    res.status(400).json({ error: 'name, type, location, and contactEmail are required' });
    return;
  }
  const business: Business = {
    id: uuidv4(),
    name,
    type,
    location,
    contactEmail,
    description: description ?? '',
    enrolledFeatures: enrolledFeatures ?? [],
    usualSupplierIds: (req.body as Partial<Business>).usualSupplierIds ?? [],
    createdAt: new Date().toISOString(),
  };
  db.businesses.push(business);
  res.status(201).json(business);
};

export const updateBusiness = (req: Request, res: Response): void => {
  const idx = db.businesses.findIndex((b) => b.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Business not found' });
    return;
  }
  db.businesses[idx] = { ...db.businesses[idx], ...req.body, id: req.params.id };
  res.json(db.businesses[idx]);
};

export const deleteBusiness = (req: Request, res: Response): void => {
  const idx = db.businesses.findIndex((b) => b.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Business not found' });
    return;
  }
  db.businesses.splice(idx, 1);
  res.status(204).send();
};
