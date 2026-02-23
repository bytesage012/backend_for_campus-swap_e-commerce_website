import type { Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';
import logger from '../utils/logger.js';

export const saveListing = async (req: any, res: Response) => {
    const { id: listingId } = req.params;
    const userId = req.user.id;

    try {
        const listing = await prisma.listing.findUnique({ where: { id: listingId } });
        if (!listing) return res.status(404).json({ message: 'Listing not found' });

        await prisma.savedItem.upsert({
            where: {
                userId_listingId: {
                    userId,
                    listingId,
                },
            },
            update: {},
            create: {
                userId,
                listingId,
            },
        });

        // Increment ListingAnalytics saves
        await prisma.listingAnalytics.upsert({
            where: { listingId },
            create: {
                listingId,
                saves: 1,
            },
            update: {
                saves: { increment: 1 },
            },
        });

        logger.info('Listing Saved', { userId, listingId });
        return res.json({ message: 'Listing added to watchlist' });
    } catch (error) {
        return handleControllerError(res, error, 'SaveListing');
    }
};

export const unsaveListing = async (req: any, res: Response) => {
    const { id: listingId } = req.params;
    const userId = req.user.id;

    try {
        await prisma.savedItem.delete({
            where: {
                userId_listingId: {
                    userId,
                    listingId,
                },
            },
        });

        // Decrement ListingAnalytics saves
        await prisma.listingAnalytics.update({
            where: { listingId },
            data: {
                saves: { decrement: 1 },
            },
        });

        logger.info('Listing Unsaved', { userId, listingId });
        return res.json({ message: 'Listing removed from watchlist' });
    } catch (error) {
        // If it doesn't exist, we still count as success or handle gracefully
        if ((error as any).code === 'P2025') {
            return res.json({ message: 'Listing removed from watchlist' });
        }
        return handleControllerError(res, error, 'UnsaveListing');
    }
};

export const getWatchlist = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const items = await prisma.savedItem.findMany({
            where: { userId },
            include: {
                listing: {
                    include: {
                        images: true,
                        seller: {
                            select: {
                                fullName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.json({ items });
    } catch (error) {
        return handleControllerError(res, error, 'GetWatchlist');
    }
};
