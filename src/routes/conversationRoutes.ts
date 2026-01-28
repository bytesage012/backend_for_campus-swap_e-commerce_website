import { Router } from 'express';
import { protect } from './authRoutes.js';
import {
    startConversation,
    listConversations,
    sendMessage,
    getMessages,
    getConversationById,
    markConversationAsRead,
} from '../controllers/conversationController.js';

const router = Router();

router.use(protect);

router.post('/', startConversation);
router.get('/', listConversations);
router.post('/:id/messages', sendMessage);
router.post('/:id/read', markConversationAsRead);
router.get('/:id/messages', getMessages);
router.get('/:id', getConversationById);

export default router;
