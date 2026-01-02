import express from 'express';
import {
    createListing,
    getListings,
    getListingById,
    updateListing,
    deleteListing,
    purchaseListing,
    updateStatus,
    reserveListing
} from '../controllers/listingController.js';
import { searchListings } from '../controllers/searchController.js';
import { saveListing, unsaveListing } from '../controllers/savedItemController.js';
import { upload } from '../middleware/uploadMiddleware.js';
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

router.get('/search', searchListings);

router.post('/', protect, upload.array('images', 5), createListing);
router.get('/', getListings);
router.get('/:id', getListingById);
router.patch('/:id', protect, updateListing);
router.delete('/:id', protect, deleteListing);

// Marketplace Interaction Routes
router.post('/:id/purchase', protect, purchaseListing);
router.patch('/:id/status', protect, updateStatus);
router.post('/:id/reserve', protect, reserveListing);

// Watchlist routes
router.post('/:id/save', protect, saveListing);
router.delete('/:id/save', protect, unsaveListing);

export default router;
