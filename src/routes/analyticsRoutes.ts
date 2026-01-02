import { Router } from 'express';
import { protect } from './authRoutes.js';
import { getListingAnalytics, getSellerAnalytics } from '../controllers/analyticsController.js';

const router = Router();

router.use(protect);

router.get('/listings/:id', getListingAnalytics);
router.get('/seller', getSellerAnalytics);

export default router;
