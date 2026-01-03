import { Router } from 'express';
import { protect } from './authRoutes.js';
import { getListingAnalytics, getSellerAnalytics } from '../controllers/analyticsController.js';
import { getSellerProfileAnalytics } from '../controllers/sellerAnalyticsController.js';

const router = Router();

router.use(protect);

router.get('/listings/:id', getListingAnalytics);
router.get('/seller', getSellerAnalytics); // Logged in user dashboard
router.get('/seller/:userId', getSellerProfileAnalytics); // Specific seller profile analysis

export default router;
