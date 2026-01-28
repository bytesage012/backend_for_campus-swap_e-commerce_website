import express from 'express';
import { getPublicProfile } from '../controllers/userController.js';
import { protect } from './authRoutes.js';

const router = express.Router();

// Public route to view a profile
router.get('/:id/profile', protect, getPublicProfile);

export default router;
