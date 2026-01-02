import { Router } from 'express';
import { protect } from './authRoutes.js';
import {
    getTheme,
    updateTheme,
    getFacultyColors,
} from '../controllers/preferenceController.js';

const router = Router();

router.get('/theme', protect, getTheme);
router.patch('/theme', protect, updateTheme);
router.get('/faculties/colors', protect, getFacultyColors);

export default router;
