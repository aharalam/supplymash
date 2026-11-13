import { Request, Response } from 'express';
import { reseed } from '../models/store';

export function resetDemo(_req: Request, res: Response): void {
  reseed();
  res.json({ ok: true });
}
