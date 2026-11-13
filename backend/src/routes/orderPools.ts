import { Router } from 'express';
import {
  getOrderPools,
  getOrderPoolById,
  createOrderPool,
  joinOrderPool,
} from '../controllers/orderPools';

const router = Router();

router.get('/', getOrderPools);
router.get('/:id', getOrderPoolById);
router.post('/', createOrderPool);
router.post('/:id/join', joinOrderPool);

export default router;
