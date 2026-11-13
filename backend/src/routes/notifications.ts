import { Router } from 'express';
import { getNotifications, markNotificationsRead } from '../controllers/notifications';

const router = Router();
router.get('/', getNotifications);
router.post('/read', markNotificationsRead);
export default router;
