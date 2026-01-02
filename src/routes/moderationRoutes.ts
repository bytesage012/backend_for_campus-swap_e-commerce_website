import { Router } from 'express';
import { protect } from '../routes/authRoutes.js';
import { requireAdmin as adminOnly } from '../middleware/adminMiddleware.js';
import * as moderationController from '../controllers/moderationController.js';

const router = Router();

// all routes require admin access
router.use(protect, adminOnly);

router.get('/queue', moderationController.getModerationQueue);
router.post('/:id/review', moderationController.submitReview);
router.get('/removed', moderationController.getRemovedListings);

export default router;
