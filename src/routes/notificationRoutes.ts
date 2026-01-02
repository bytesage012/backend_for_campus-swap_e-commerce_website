import { Router } from 'express';
import { protect } from './authRoutes.js';
import {
    getNotifications,
    markRead,
    markAllRead,
} from '../controllers/notificationController.js';

const router = Router();

router.use(protect);

router.get('/', getNotifications);
router.post('/:id/read', markRead);
router.post('/read-all', markAllRead);

export default router;
