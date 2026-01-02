import { Router } from 'express';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { getDashboard } from '../controllers/adminController.js';
import { getUsers, bulkUserAction, exportUsers } from '../controllers/adminUserController.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for admin endpoints: 10 requests/minute
const adminRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { message: 'Too many requests from this IP, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// All admin routes require admin authentication and rate limiting
router.use(requireAdmin);
router.use(adminRateLimiter);

router.get('/dashboard', getDashboard);

// User Management
router.get('/users', getUsers);
router.get('/users/export', exportUsers);
router.post('/users/bulk-action', bulkUserAction);

export default router;
