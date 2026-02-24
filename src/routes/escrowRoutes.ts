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

// Smart Contracts
import { createSmartContract, signContract, releaseFunds, getContract } from '../controllers/smartContractController.js';
router.post('/smart-contract', protect, createSmartContract);
router.post('/smart-contract/:id/sign', protect, signContract);
router.post('/smart-contract/:id/release', protect, releaseFunds);
router.get('/smart-contract/:id', protect, getContract);

export default router;


