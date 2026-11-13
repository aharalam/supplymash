import { Router } from 'express';
import { getScrapOffers } from '../controllers/scrapOffers';

const router = Router();
router.get('/', getScrapOffers);
export default router;
