import express from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/authController.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';


const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Multer config for avatars
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/avatars';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed') as any, false);
        }
    }
});


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

export const optionalProtect = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return next();
    }
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (error) {
        // Invalid token, continue as guest
    }
    next();
};

export const restrictTo = (...roles: string[]) => {
    return (req: any, res: any, next: any) => {
        // req.user is set by protect middleware
        if (!roles.includes(req.user?.role)) {
            return res.status(403).json({ message: 'You do not have permission to perform this action' });
        }
        next();
    };
};

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, uploadAvatar.single('avatar'), updateProfile);


export default router;
