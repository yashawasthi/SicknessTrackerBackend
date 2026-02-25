import { Router } from 'express';
import { getEntriesByYear, getYears, upsertEntry } from '../controllers/entryController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/years', getYears);
router.get('/year/:year', getEntriesByYear);
router.post('/', upsertEntry);

export default router;
