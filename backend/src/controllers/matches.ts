import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/store';
import { Match } from '../types';

export const getMatches = (_req: Request, res: Response): void => {
  res.json(db.matches);
};

/**
 * Run AI-powered matching between resource offerings and requests.
 * Uses a simple heuristic for the MVP; wire up watsonx.ai for production.
 */
export const triggerMatching = (_req: Request, res: Response): void => {
  const offerings = db.listings.filter((l) => l.type === 'offering' && l.status === 'active');
  const requests = db.listings.filter((l) => l.type === 'requesting' && l.status === 'active');

  const newMatches: Match[] = [];

  for (const offer of offerings) {
    for (const request of requests) {
      // Skip if same business
      if (offer.businessId === request.businessId) continue;
      // Skip if already matched
      const alreadyMatched = db.matches.some(
        (m) =>
          m.offeringListingId === offer.id &&
          m.requestingListingId === request.id &&
          m.status !== 'declined',
      );
      if (alreadyMatched) continue;

      // Simple category match — replace with watsonx.ai call for semantic matching
      if (offer.materialCategory === request.materialCategory) {
        const quantityRatio = Math.min(offer.quantity, request.quantity) / Math.max(offer.quantity, request.quantity);
        const score = Math.round(quantityRatio * 85 + 15); // 15–100

        const match: Match = {
          id: uuidv4(),
          offeringListingId: offer.id,
          requestingListingId: request.id,
          offeringBusiness: offer.businessName,
          requestingBusiness: request.businessName,
          material: offer.title,
          compatibilityScore: score,
          aiReasoning: `Both listings involve ${offer.materialCategory.replace(/_/g, ' ')}. ${offer.businessName} has ${offer.quantity} ${offer.unit} available; ${request.businessName} needs ${request.quantity} ${request.unit}. Quantity compatibility: ${Math.round(quantityRatio * 100)}%.`,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        db.matches.push(match);
        newMatches.push(match);
      }
    }
  }

  res.json({ matched: newMatches.length, matches: newMatches });
};

export const respondToMatch = (req: Request, res: Response): void => {
  const match = db.matches.find((m) => m.id === req.params.id);
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  const { status } = req.body as { status: Match['status'] };
  if (!['accepted', 'declined', 'completed'].includes(status)) {
    res.status(400).json({ error: 'status must be accepted, declined, or completed' });
    return;
  }
  match.status = status;

  // Update listing statuses on acceptance
  if (status === 'accepted') {
    const offer = db.listings.find((l) => l.id === match.offeringListingId);
    const request = db.listings.find((l) => l.id === match.requestingListingId);
    if (offer) offer.status = 'matched';
    if (request) request.status = 'matched';
  }

  res.json(match);
};
