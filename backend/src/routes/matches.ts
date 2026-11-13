import { Router } from 'express';
import { getMatches, triggerMatching, respondToMatch } from '../controllers/matches';

const router = Router();

router.get('/', getMatches);
router.post('/run', triggerMatching);
router.put('/:id/respond', respondToMatch);

export default router;
