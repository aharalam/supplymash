import { Router } from 'express';
import {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  joinWarehouse,
} from '../controllers/warehouses';

const router = Router();

router.get('/', getWarehouses);
router.get('/:id', getWarehouseById);
router.post('/', createWarehouse);
router.post('/:id/join', joinWarehouse);

export default router;
