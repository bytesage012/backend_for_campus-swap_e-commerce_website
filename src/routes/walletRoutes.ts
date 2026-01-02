import { Router } from 'express';
import { protect } from './authRoutes.js';
import { getBalance, getTransactions } from '../controllers/walletController.js';
import {
    setupPin,
    verifyPin,
    initiateWithdrawal,
    getWithdrawals,
} from '../controllers/withdrawalController.js';

const router = Router();

// Middleware to protect all wallet routes
router.use(protect);

// Wallet balance and transactions
router.get('/balance', getBalance);
router.get('/transactions', getTransactions);

// PIN management
router.post('/pin/setup', setupPin);
router.post('/pin/verify', verifyPin);

// Withdrawals
router.post('/withdraw', initiateWithdrawal);
router.get('/withdrawals', getWithdrawals);

export default router;
