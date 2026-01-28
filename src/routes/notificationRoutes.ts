import { Router } from 'express';
import { protect } from './authRoutes.js';
import {
    getNotifications,
    getNotificationById,
    markRead,
    markAllRead,
} from '../controllers/notificationController.js';

const router = Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/:id', getNotificationById);
router.post('/:id/read', markRead);
router.post('/read-all', markAllRead);

export default router;
