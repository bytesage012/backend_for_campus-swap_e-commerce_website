import { Router } from 'express';
import { protect } from './authRoutes.js';
import { getWatchlist } from '../controllers/savedItemController.js';

const router = Router();

router.get('/', protect, getWatchlist);

export default router;
