import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/store';
import { OrderPool, PoolMember } from '../types';

export const getOrderPools = (req: Request, res: Response): void => {
  const { status } = req.query;
  let results = db.orderPools;
  if (status) results = results.filter((p) => p.status === status);
  res.json(results);
};

export const getOrderPoolById = (req: Request, res: Response): void => {
  const pool = db.orderPools.find((p) => p.id === req.params.id);
  if (!pool) {
    res.status(404).json({ error: 'Order pool not found' });
    return;
  }
  res.json(pool);
};

export const createOrderPool = (req: Request, res: Response): void => {
  const { title, supplier, category, location, deadline } = req.body as Partial<OrderPool>;
  if (!title || !supplier || !category || !location || !deadline) {
    res.status(400).json({ error: 'title, supplier, category, location, and deadline are required' });
    return;
  }
  const pool: OrderPool = {
    id: uuidv4(),
    title,
    supplier,
    category,
    location,
    members: [],
    status: 'open',
    deadline,
    estimatedSavings: 0,
    createdAt: new Date().toISOString(),
  };
  db.orderPools.push(pool);
  res.status(201).json(pool);
};

export const joinOrderPool = (req: Request, res: Response): void => {
  const pool = db.orderPools.find((p) => p.id === req.params.id);
  if (!pool) {
    res.status(404).json({ error: 'Order pool not found' });
    return;
  }
  if (pool.status !== 'open' && pool.status !== 'forming') {
    res.status(400).json({ error: 'Pool is not accepting new members' });
    return;
  }
  const { businessId, itemDescription, quantity, unit } = req.body as Partial<PoolMember>;
  if (!businessId || !itemDescription || !quantity) {
    res.status(400).json({ error: 'businessId, itemDescription, and quantity are required' });
    return;
  }
  const business = db.businesses.find((b) => b.id === businessId);
  const member: PoolMember = {
    businessId,
    businessName: business?.name ?? 'Unknown',
    itemDescription,
    quantity,
    unit: unit ?? 'units',
    joinedAt: new Date().toISOString(),
  };
  pool.members.push(member);
  pool.status = 'forming';
  // Rough savings estimate: $15 saved per additional member after the first
  pool.estimatedSavings = Math.max(0, (pool.members.length - 1) * 15);
  res.json(pool);
};
