import { Router } from 'express';
import multer from 'multer';
import { protect, restrictTo } from './authRoutes.js';
import {
    initiateBulkCreate,
    initiateBulkRenew,
    getOperationStatus,
    initiateBulkMessage,
    initiateExport,
    initiatePriceOptimization
} from '../controllers/bulkOperationsController.js';

import fs from 'fs';
import path from 'path';

const router = Router();

// Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let subfolder = 'misc';
        if (req.originalUrl.includes('/listings')) {
            subfolder = 'bulk-listings';
        } else if (req.originalUrl.includes('/messages')) {
            subfolder = 'bulk-messages';
        } else if (req.originalUrl.includes('/export')) {
            subfolder = 'exports';
        }

        const uploadPath = path.join('uploads', subfolder);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Base Route: /api/bulk

// Bulk Listing Creation (CSV/Excel)
router.post('/listings', protect, restrictTo('SELLER', 'ADMIN'), upload.single('file'), initiateBulkCreate);

// Bulk Renew
router.post('/listings/renew', protect, restrictTo('SELLER', 'ADMIN'), initiateBulkRenew);

// Bulk Price Optimization
router.post('/listings/price-optimize', protect, restrictTo('SELLER', 'ADMIN'), initiatePriceOptimization);

// Bulk Messaging
router.post('/messages', protect, restrictTo('SELLER', 'ADMIN'), initiateBulkMessage);

// Bulk Export
router.post('/export', protect, restrictTo('SELLER', 'ADMIN'), initiateExport);

// Status Polling
router.get('/status/:id', protect, getOperationStatus);

export default router;
