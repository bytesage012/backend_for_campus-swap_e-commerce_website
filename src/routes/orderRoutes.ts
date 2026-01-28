import { Router } from 'express';
import { protect } from './authRoutes.js';
import {
    getSellerOrders,
    getBuyerOrders,
    markAsDelivered,
    confirmReceipt
} from '../controllers/orderController.js';

const router = Router();

router.use(protect);

router.get('/seller', getSellerOrders);
router.get('/buyer', getBuyerOrders);
router.post('/:transactionId/deliver', markAsDelivered);
router.post('/:transactionId/confirm-receipt', confirmReceipt);

export default router;
