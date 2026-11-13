import { Request, Response } from 'express';
import { db } from '../models/store';

// GET /api/notifications (header X-Business-Id): this business's updates, newest first.
export function getNotifications(req: Request, res: Response): void {
  const businessId = req.header('x-business-id');
  if (!businessId) {
    res.status(400).json({ error: 'X-Business-Id header required' });
    return;
  }
  const mine = db.notifications.filter((n) => n.businessId === businessId).reverse();
  res.json({ unreadCount: mine.filter((n) => !n.read).length, notifications: mine });
}

// POST /api/notifications/read (header X-Business-Id): mark all of this business's updates read.
export function markNotificationsRead(req: Request, res: Response): void {
  const businessId = req.header('x-business-id');
  if (!businessId) {
    res.status(400).json({ error: 'X-Business-Id header required' });
    return;
  }
  for (const n of db.notifications) if (n.businessId === businessId) n.read = true;
  res.json({ ok: true });
}
