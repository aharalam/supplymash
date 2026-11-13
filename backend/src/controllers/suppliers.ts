import { Request, Response } from 'express';
import { db } from '../models/store';

export function getSuppliers(_req: Request, res: Response): void {
  res.json(db.suppliers);
}
