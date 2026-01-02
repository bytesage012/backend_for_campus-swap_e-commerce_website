import express from 'express';
import { uploadId, getVerificationStatus } from '../controllers/verificationController.js';
import { verificationUpload } from '../middleware/uploadMiddleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const protect = (req: any, res: any, next: any) => {
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

router.post('/upload-id', protect, verificationUpload.fields([
    { name: 'documentFront', maxCount: 1 },
    { name: 'documentBack', maxCount: 1 }
]), uploadId);

router.get('/status', protect, getVerificationStatus);

export default router;
