import { Router } from 'express';
import { getSuppliers } from '../controllers/suppliers';

const router = Router();
router.get('/', getSuppliers);
export default router;
