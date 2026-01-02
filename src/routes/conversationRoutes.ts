import { Router } from 'express';
import { protect } from './authRoutes.js';
import {
    startConversation,
    listConversations,
    sendMessage,
    getMessages,
} from '../controllers/conversationController.js';

const router = Router();

router.use(protect);

router.post('/', startConversation);
router.get('/', listConversations);
router.post('/:id/messages', sendMessage);
router.get('/:id/messages', getMessages);

export default router;
