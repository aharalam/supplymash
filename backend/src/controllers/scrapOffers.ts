import { Request, Response } from 'express';
import { db } from '../models/store';
import { ScrapOffer } from '../types';
import { toScrapOffer } from '../services/scrap';

// GET /api/scrap-offers — offers where the viewer is the holder or the requester.
export function getScrapOffers(req: Request, res: Response): void {
  const businessId = req.header('x-business-id');
  if (!businessId) {
    res.status(400).json({ error: 'X-Business-Id header required' });
    return;
  }
  const offers = db.matches
    .filter((m) => m.direction === 'ask_holder')
    .map((m) => toScrapOffer(m, businessId))
    .filter((o): o is ScrapOffer => o !== null);
  res.json(offers);
}
