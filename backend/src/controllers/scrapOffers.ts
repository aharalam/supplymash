import { Request, Response } from 'express';
import { ScrapOffer } from '../types';

const STUB_OFFERS: ScrapOffer[] = [
  {
    matchId: 'match-scrap-001',
    role: 'holder',
    material: 'Wood offcuts / chips',
    estQty: 120,
    unit: 'lbs',
    readyInDays: 5,
    suggestedPricePerUnit: 0.08,
    counterpartyLabel: 'A farm 18 mi away',
    distanceMiles: 18,
    aiReasoning: 'Your lumber order will likely produce offcuts and wood chips. A nearby Kent County farm has requested this material for animal bedding — selling it here keeps the value in Michigan.',
    status: 'pending',
  },
  {
    matchId: 'match-scrap-002',
    role: 'requester',
    material: 'Cardboard / paper scraps',
    estQty: 40,
    unit: 'lbs',
    readyInDays: 3,
    suggestedPricePerUnit: 0.05,
    counterpartyLabel: 'A café 7 mi away',
    distanceMiles: 7,
    aiReasoning: 'A local café regularly produces clean cardboard packaging from their paper goods orders. It matches your request for composting material.',
    status: 'accepted',
  },
];

export function getScrapOffers(req: Request, res: Response): void {
  const businessId = req.headers['x-business-id'] as string | undefined;
  if (!businessId) {
    res.status(400).json({ error: 'X-Business-Id header required' });
    return;
  }
  res.json(STUB_OFFERS);
}
