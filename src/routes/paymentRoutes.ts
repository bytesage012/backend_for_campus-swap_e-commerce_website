import express from 'express';
import { initializeDeposit, paystackWebhook, verifyTransaction } from '../controllers/paymentController.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env['JWT_SECRET'] || 'secret';

const protect = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized' });
    }
};

router.post('/deposit', protect, initializeDeposit);
router.post('/webhook', paystackWebhook);
router.get('/verify/:reference', protect, verifyTransaction);

export default router;
