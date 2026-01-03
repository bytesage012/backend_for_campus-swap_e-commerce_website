import { Router } from 'express';
import { getEscrowDashboard } from '../controllers/escrowDashboardController.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { protect } from './authRoutes.js';
import { createSmartContract, signContract, getContract, releaseFunds } from '../controllers/smartContractController.js';

const router = Router();

router.get('/dashboard', requireAdmin, getEscrowDashboard);

// Smart Contracts
router.post('/smart-contract', protect, createSmartContract);
router.post('/smart-contract/:id/sign', protect, signContract);
router.get('/smart-contract/:id', protect, getContract);
router.post('/smart-contract/:id/release', protect, releaseFunds);

export default router;


