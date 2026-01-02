import { Router } from 'express';
import { protect } from './authRoutes.js';
import { createReport } from '../controllers/reportController.js';

const router = Router();

router.use(protect);

router.post('/user/:id', createReport);
router.post('/listing/:id', createReport);

export default router;
