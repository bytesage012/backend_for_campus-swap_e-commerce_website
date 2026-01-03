import { Router } from 'express';
import { protect, restrictTo, optionalProtect } from './authRoutes.js';
import { getListingAnalytics, getSellerAnalytics } from '../controllers/analyticsController.js';
import { getSellerProfileAnalytics } from '../controllers/sellerAnalyticsController.js';
import { getPlatformGrowthMetrics, recordAnalyticsEvent } from '../controllers/platformAnalyticsController.js';

const router = Router();

// Seller Analytics (Protected)
router.get('/seller/:userId', protect, getSellerProfileAnalytics);

// Platform Growth Analytics (Admin Only)
router.get('/platform/growth', protect, restrictTo('ADMIN'), getPlatformGrowthMetrics);

// Public Event Tracking (Optional Auth)
router.post('/platform/events', optionalProtect, recordAnalyticsEvent);

// Legacy/Other Analytics (Protected)
router.use(protect);
router.get('/listings/:id', getListingAnalytics);
router.get('/seller', getSellerAnalytics);

export default router;
