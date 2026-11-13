import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/store';
import { Warehouse, WarehouseMember } from '../types';

export const getWarehouses = (req: Request, res: Response): void => {
  const { status } = req.query;
  let results = db.warehouses;
  if (status) results = results.filter((w) => w.status === status);
  res.json(results);
};

export const getWarehouseById = (req: Request, res: Response): void => {
  const warehouse = db.warehouses.find((w) => w.id === req.params.id);
  if (!warehouse) {
    res.status(404).json({ error: 'Warehouse not found' });
    return;
  }
  res.json(warehouse);
};

export const createWarehouse = (req: Request, res: Response): void => {
  const { name, location, totalSqFt, features, pricePerSqFtPerMonth } = req.body as Partial<Warehouse>;
  if (!name || !location || !totalSqFt) {
    res.status(400).json({ error: 'name, location, and totalSqFt are required' });
    return;
  }
  const warehouse: Warehouse = {
    id: uuidv4(),
    name,
    location,
    totalSqFt,
    availableSqFt: totalSqFt,
    features: features ?? [],
    pricePerSqFtPerMonth: pricePerSqFtPerMonth ?? 2.5,
    members: [],
    status: 'available',
    createdAt: new Date().toISOString(),
  };
  db.warehouses.push(warehouse);
  res.status(201).json(warehouse);
};

export const joinWarehouse = (req: Request, res: Response): void => {
  const warehouse = db.warehouses.find((w) => w.id === req.params.id);
  if (!warehouse) {
    res.status(404).json({ error: 'Warehouse not found' });
    return;
  }
  const { businessId, sqFtLeased, leaseStartDate, leaseEndDate } = req.body as Partial<WarehouseMember>;
  if (!businessId || !sqFtLeased || !leaseStartDate || !leaseEndDate) {
    res.status(400).json({ error: 'businessId, sqFtLeased, leaseStartDate, and leaseEndDate are required' });
    return;
  }
  if (sqFtLeased > warehouse.availableSqFt) {
    res.status(400).json({ error: 'Not enough available space' });
    return;
  }
  const business = db.businesses.find((b) => b.id === businessId);
  const member: WarehouseMember = {
    businessId,
    businessName: business?.name ?? 'Unknown',
    sqFtLeased,
    leaseStartDate,
    leaseEndDate,
  };
  warehouse.members.push(member);
  warehouse.availableSqFt -= sqFtLeased;
  warehouse.status = warehouse.availableSqFt === 0 ? 'full' : 'partial';
  res.json(warehouse);
};
