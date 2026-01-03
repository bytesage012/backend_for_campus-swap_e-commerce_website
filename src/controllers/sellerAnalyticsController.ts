import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';

export const getSellerProfileAnalytics = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;

        // Ensure user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 1. PERFORMANCE SCORECARD
        const reviews = await prisma.review.findMany({
            where: { targetId: userId },
            select: { rating: true }
        });

        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

        // Response Rate (Approximate: Conversations where seller replied)
        // Find conversations where user is the 'seller' (target of a list, strictly speaking Listing owner)
        // We need to look at conversations associated with user's listings
        const sellerConversations = await prisma.conversation.findMany({
            where: {
                listing: { sellerId: userId }
            },
            include: {
                messages: {
                    take: 1, // Just check if any exist from seller? No, need check if seller sent a message
                    where: { senderId: userId }
                }
            }
        });

        const answeredConversations = sellerConversations.filter(c => c.messages.length > 0).length;
        const responseRate = sellerConversations.length > 0
            ? (answeredConversations / sellerConversations.length) * 100
            : 0;

        // 2. FINANCIAL ANALYTICS
        // Get successful sales (ESCROW RELEASED or plain SALE SUCCESS if we had those)
        const sales = await prisma.transaction.findMany({
            where: {
                wallet: { userId: userId },
                type: 'SALE', // Assuming SALE type designates incoming funds from sale
                status: 'SUCCESS',
            }
        });

        // Also check Escrow RELEASED transactions where this user is seller
        const escrowSales = await prisma.smartContract.findMany({
            where: {
                sellerId: userId,
                status: 'COMPLETED' // or based on Transaction status
            },
            include: { transaction: true }
        });

        // Calculate Revenue Trends (Mocking daily aggregation for simplicity in MVP)
        const totalRevenue = sales.reduce((sum, t) => sum + Number(t.amount), 0);

        // 3. INVENTORY OPTIMIZATION
        const listings = await prisma.listing.findMany({
            where: { sellerId: userId },
            include: { analytics: true }
        });

        const activeListings = listings.filter(l => l.status === 'ACTIVE').length;
        const soldListings = listings.filter(l => l.status === 'SOLD').length;

        const totalViews = listings.reduce((sum, l) => sum + (l.analytics?.totalViews || 0), 0);
        const conversionRate = totalViews > 0 ? (soldListings / totalViews) * 100 : 0;


        res.json({
            scorecard: {
                averageRating: parseFloat(averageRating.toFixed(1)),
                reviewCount: reviews.length,
                responseRate: parseFloat(responseRate.toFixed(1)),
                activeListings
            },
            financials: {
                totalRevenue,
                salesCount: sales.length + escrowSales.length,
                // In a real app, strict distinct logic needed if overlap
            },
            inventory: {
                totalListings: listings.length,
                soldListings,
                totalViews,
                conversionRate: parseFloat(conversionRate.toFixed(2))
            },
            customerInsights: {
                // Mocking for now as we don't have detailed demographic data in schema
                topLocations: ["Student Center", "Hostel A"],
                repeatCustomerRate: 15.0
            }
        });

    } catch (error) {
        handleControllerError(res, error, 'GetSellerAnalytics');
    }
};
