import { Request, Response } from 'express';

export function resetDemo(_req: Request, res: Response): void {
  // Phase-0 stub: future implementation will reseed the in-memory store (§10)
  res.json({ ok: true });
}
