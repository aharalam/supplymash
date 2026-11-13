import { Request, Response } from 'express';
import { Metrics } from '../types';

const STUB_METRICS: Metrics = {
  dollarsSaved: 312.50,
  dollarsSavedClosed: 187.50,
  dollarsSavedProjected: 125.00,
  deliveriesAvoided: 4,
  lbsDiverted: 340,
  dollarsKeptInMichigan: 1248.00,
};

export function getMetrics(_req: Request, res: Response): void {
  res.json(STUB_METRICS);
}
