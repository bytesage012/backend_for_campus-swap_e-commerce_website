import { Router } from 'express';
import { protect } from './authRoutes.js';
import { confirmReceipt, disputeTransaction } from '../controllers/escrowController.js';

const router = Router();

router.use(protect);

router.post('/:id/confirm-receipt', confirmReceipt);
router.post('/:id/dispute', disputeTransaction);

export default router;
