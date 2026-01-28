import { Router } from 'express';
import { getEscrowDashboard } from '../controllers/escrowDashboardController.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { protect } from './authRoutes.js';

const router = Router();

router.get('/dashboard', requireAdmin, getEscrowDashboard);

// Purchase & Disputes
import { initiatePurchase, checkout, confirmReceipt, disputeTransaction } from '../controllers/escrowController.js';
router.post('/purchase', protect, initiatePurchase);
router.post('/checkout', protect, checkout);
router.post('/transactions/:id/confirm', protect, confirmReceipt);
router.post('/transactions/:id/dispute', protect, disputeTransaction);

export default router;


