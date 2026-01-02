import express from 'express';
import { submitReview, getUserReviews, getRatingSummary } from '../controllers/reviewController.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

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

// Review endpoints nested under user or transaction as appropriate
// But following the test's patterns:
// POST /api/transactions/:id/review
// GET /api/users/:id/reviews
// GET /api/users/:id/rating-summary

// Actually, I'll export separate routers or use a common one.
// Let's use a common pattern for now.

router.post('/transactions/:id/review', protect, submitReview);
router.get('/users/:id/reviews', getUserReviews);
router.get('/users/:id/rating-summary', getRatingSummary);

export default router;
