/**
 * Updates feed: tells a business when something another business did affects it.
 * Messages never name another business unless a scrap deal has been accepted.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/store';
import { Notification } from '../types';

export function notify(
  businessId: string,
  kind: Notification['kind'],
  title: string,
  body: string,
  refs: { poolId?: string; matchId?: string } = {},
): void {
  db.notifications.push({ id: uuidv4(), businessId, kind, title, body, createdAt: new Date().toISOString(), read: false, ...refs });
}

export const money = (n: number) => `$${n.toFixed(2)}`;
