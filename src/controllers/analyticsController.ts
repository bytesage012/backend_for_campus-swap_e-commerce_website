import type { Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';

export const getListingAnalytics = async (req: any, res: Response) => {
    const userId = req.user.id;
    const { id: listingId } = req.params;

    try {
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
        });

        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        if (listing.sellerId !== userId) {
            return res.status(403).json({ message: 'Not authorized to view analytics for this listing' });
        }

        let analytics = await prisma.listingAnalytics.findUnique({
            where: { listingId },
        });

        if (!analytics) {
            // Create empty analytics if not exists
            analytics = await prisma.listingAnalytics.create({
                data: { listingId },
            });
        }

        res.json(analytics);
    } catch (error) {
        return handleControllerError(res, error, 'GetListingAnalytics');
    }
};

export const getSellerAnalytics = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const listings = await prisma.listing.findMany({
            where: { sellerId: userId },
            include: {
                analytics: true,
            },
        });

        const totalListings = listings.length;
        const activeListings = listings.filter(l => l.status === 'ACTIVE').length;
        const soldListings = listings.filter(l => l.status === 'SOLD').length;

        const totalViews = listings.reduce((sum, l) => sum + (l.analytics?.totalViews || 0), 0);
        const totalSaves = listings.reduce((sum, l) => sum + (l.analytics?.saves || 0), 0);
        const totalMessages = listings.reduce((sum, l) => sum + (l.analytics?.messages || 0), 0);

        // Calculate view distribution
        const viewSources = listings.reduce((acc, l) => ({
            search: acc.search + (l.analytics?.searchViews || 0),
            faculty: acc.faculty + (l.analytics?.facultyViews || 0),
            direct: acc.direct + (l.analytics?.directViews || 0),
        }), { search: 0, faculty: 0, direct: 0 });

        res.json({
            overview: {
                totalListings,
                activeListings,
                soldListings,
                totalViews,
                totalSaves,
                totalMessages,
            },
            performance: {
                conversionRate: totalViews > 0 ? ((soldListings / totalViews) * 100).toFixed(2) : '0',
                ctr: totalViews > 0 ? ((totalMessages / totalViews) * 100).toFixed(2) : '0', // Engagement rate
            },
            viewSources,
            topListings: listings
                .sort((a, b) => (b.analytics?.totalViews || 0) - (a.analytics?.totalViews || 0))
                .slice(0, 5)
                .map(l => ({
                    id: l.id,
                    title: l.title,
                    views: l.analytics?.totalViews || 0,
                    saves: l.analytics?.saves || 0,
                })),
        });
    } catch (error) {
        return handleControllerError(res, error, 'GetSellerAnalytics');
    }
};
