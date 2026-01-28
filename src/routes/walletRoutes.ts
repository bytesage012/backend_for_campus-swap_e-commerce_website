import { Router } from 'express';
import { protect } from './authRoutes.js';
import {
    getBalance,
    getTransactions,
    getTransactionDetail,
    setupPin,
    updatePin,
    verifyPin
} from '../controllers/walletController.js';
import {
    initiateWithdrawal,
    getWithdrawals,
} from '../controllers/withdrawalController.js';

const router = Router();

// Middleware to protect all wallet routes
router.use(protect);

// Wallet balance and transactions
router.get('/balance', getBalance);
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionDetail);

// PIN management
router.post('/pin/setup', setupPin);
router.post('/pin/update', updatePin);
router.post('/pin/verify', verifyPin);

// Withdrawals
router.post('/withdraw', initiateWithdrawal);
router.get('/withdrawals', getWithdrawals);

export default router;
