import { Router } from 'express';
import { getPools, getPool, closePool } from '../controllers/pools';

const router = Router();
router.get('/', getPools);
router.get('/:id', getPool);
router.post('/:id/close', closePool);
export default router;
