import express from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/authController.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const protect = (req: any, res: any, next: any) => {
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

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);

export default router;
