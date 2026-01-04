import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import { bulkOperationsQueue } from '../services/queueService.js';
import { handleControllerError } from './authController.js';
import { z } from 'zod';

// Validators
const bulkRenewSchema = z.object({
    criteria: z.object({
        category: z.string().optional(),
        lastRenewedBefore: z.string().optional(),
    }),
    options: z.object({
        bumpToTop: z.boolean().optional(),
    }).optional()
});

const bulkMessageSchema = z.object({
    recipients: z.array(z.string()), // User IDs
    templateId: z.string().optional(),
    content: z.string(),
    metadata: z.record(z.string(), z.any()).optional()
});

const priceOptimizeSchema = z.object({
    listingIds: z.array(z.string()).optional(),
    criteria: z.object({
        category: z.string().optional(),
        minPrice: z.number().optional(),
    }).optional()
});

const exportSchema = z.object({
    type: z.string(), // CSV, EXCEL, PDF, JSON
    filters: z.record(z.string(), z.any()).optional(),
    columns: z.array(z.string()).optional()
});

export const initiateBulkCreate = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const userId = (req as any).user.id;

        // Create Audit Record
        const operation = await prisma.bulkOperation.create({
            data: {
                userId,
                type: 'BULK_CREATE',
                status: 'PENDING',
                metadata: { originalName: req.file.originalname }
            }
        });

        // Add to Queue
        await bulkOperationsQueue.add('BULK_CREATE', {
            operationId: operation.id,
            userId,
            fileUrl: req.file.path // Path to temp file
        });

        res.status(202).json({
            message: 'Bulk creation initiated',
            operationId: operation.id
        });
    } catch (error) {
        handleControllerError(res, error, 'Bulk Create');
    }
};

export const initiateBulkRenew = async (req: Request, res: Response) => {
    try {
        const { criteria, options } = bulkRenewSchema.parse(req.body);
        const userId = (req as any).user.id;

        const operation = await prisma.bulkOperation.create({
            data: {
                userId,
                type: 'BULK_RENEW',
                status: 'PENDING',
                metadata: { criteria, options }
            }
        });

        await bulkOperationsQueue.add('BULK_RENEW', {
            operationId: operation.id,
            userId,
            criteria
        });

        res.status(202).json({
            message: 'Bulk renewal initiated',
            operationId: operation.id
        });

    } catch (error) {
        handleControllerError(res, error, 'Bulk Renew');
    }
};

export const getOperationStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        const operation = await prisma.bulkOperation.findUnique({
            where: { id: id as string }
        });

        if (!operation) {
            res.status(404).json({ error: 'Operation not found' });
            return;
        }

        if (operation.userId !== userId) { // Simple ownership check
            // In real app, admins might see all
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        res.json(operation);
    } catch (error) {
        handleControllerError(res, error, 'Get Operation Status');
    }
};

export const initiatePriceOptimization = async (req: Request, res: Response) => {
    try {
        const payload = priceOptimizeSchema.parse(req.body);
        const userId = (req as any).user.id;

        const operation = await prisma.bulkOperation.create({
            data: {
                userId,
                type: 'PRICE_OPTIMIZE',
                status: 'PENDING',
                metadata: payload as any
            }
        });

        await bulkOperationsQueue.add('PRICE_OPTIMIZE', {
            operationId: operation.id,
            userId,
            payload
        });

        res.status(202).json({ message: 'Price optimization initiated', operationId: operation.id });
    } catch (error) {
        handleControllerError(res, error, 'Price Optimization');
    }
};

export const initiateBulkMessage = async (req: Request, res: Response) => {
    try {
        const payload = bulkMessageSchema.parse(req.body);
        const userId = (req as any).user.id;

        const operation = await prisma.bulkOperation.create({
            data: {
                userId,
                type: 'BULK_MESSAGE',
                status: 'PENDING',
                metadata: payload as any
            }
        });

        await bulkOperationsQueue.add('BULK_MESSAGE', {
            operationId: operation.id,
            userId,
            payload
        });

        res.status(202).json({ message: 'Bulk messaging initiated', operationId: operation.id });
    } catch (error) {
        handleControllerError(res, error, 'Bulk Message');
    }
};

export const initiateExport = async (req: Request, res: Response) => {
    try {
        const payload = exportSchema.parse(req.body);
        const userId = (req as any).user.id;

        const operation = await prisma.bulkOperation.create({
            data: {
                userId,
                type: 'EXPORT',
                status: 'PENDING',
                metadata: payload as any
            }
        });

        await bulkOperationsQueue.add('EXPORT', {
            operationId: operation.id,
            userId,
            payload
        });

        res.status(202).json({ message: 'Export initiated', operationId: operation.id });
    } catch (error) {
        handleControllerError(res, error, 'Bulk Export');
    }
};
