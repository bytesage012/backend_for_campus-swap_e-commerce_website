import type { Request, Response } from 'express';
import { ModerationService } from '../services/moderationService.js';
import prisma from '../prisma.js';
import { z } from 'zod';

export const getModerationQueue = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const minScore = parseInt(req.query.minScore as string) || 0;

        const result = await ModerationService.getQueue(page, limit, minScore);
        res.json({
            items: result.items,
            total: result.total,
            pages: result.pages
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch queue' });
    }
};

import { ModerationAction } from '@prisma/client';

export const submitReview = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Listing ID required' });

        // @ts-expect-error - User populated by middleware
        const moderatorId = req.user?.id;

        if (!moderatorId) return res.status(401).json({ error: 'Unauthorized' });

        const schema = z.object({
            action: z.enum(['APPROVE', 'REJECT', 'FLAG', 'REQUEST_CHANGES']),
            reason: z.string().optional(),
            notes: z.string().optional()
        });

        const validation = schema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.format() });
        }

        const { action, reason, notes } = validation.data;

        await ModerationService.submitReview(
            id,
            moderatorId as string,
            action as ModerationAction,
            reason || '',
            notes || ''
        );

        res.json({ message: 'Review submitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
};

export const getRemovedListings = async (req: Request, res: Response) => {
    try {
        const removed = await prisma.listingModeration.findMany({
            where: { status: 'REJECTED' },
            include: {
                listing: true // Add seller/details if needed
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        });
        res.json(removed);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch removed listings' });
    }
};
