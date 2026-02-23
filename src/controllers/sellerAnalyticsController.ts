import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';

export const getSellerProfileAnalytics = async (req: Request, res: Response) => {
    try {
        const userId = req.params['userId'];
        if (!userId) return res.status(400).json({ message: 'User ID is required' });

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

        // Response Rate Implementation
        const sellerConversations = await prisma.conversation.findMany({
            where: {
                listing: { sellerId: userId }
            },
            include: {
                messages: {
                    take: 1,
                    where: { senderId: userId },
                    orderBy: { createdAt: 'asc' }
                },
                listing: true // To check creation date for response time if needed
            }
        });

        const answeredConversations = sellerConversations.filter(c => c.messages.length > 0).length;
        const responseRate = sellerConversations.length > 0
            ? (answeredConversations / sellerConversations.length) * 100
            : 0;

        // Average Response Time (Mocking logic: Time to first reply - Conversation creation)
        // In real app, we'd fetch first Buyer message vs first Seller message.
        // For MVP, we'll estimate based on 'createdAt' of conversation vs first seller message
        let totalResponseTimeMs = 0;
        let respondedCount = 0;
        sellerConversations.forEach(c => {
            if (c.messages && c.messages.length > 0) {
                const replyTime = new Date((c.messages[0] as any).createdAt).getTime();
                const startTime = new Date(c.createdAt).getTime();
                totalResponseTimeMs += (replyTime - startTime);
                respondedCount++;
            }
        });
        const avgResponseTimeHours = respondedCount > 0 ? (totalResponseTimeMs / respondedCount) / (1000 * 60 * 60) : 0;


        // 2. FINANCIAL ANALYTICS
        // Get successful sales
        const sales = await prisma.transaction.findMany({
            where: {
                wallet: { userId: userId },
                type: 'SALE',
                status: 'SUCCESS',
            },
            include: {
                listing: true
            }
        });

        const totalRevenue = sales.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalFees = sales.reduce((sum, t) => sum + Number(t.platformFee || 0), 0);
        const netProfit = totalRevenue - totalFees;

        // Revenue Trends (Mocking Monthly grouping)
        const revenueByMonth: Record<string, number> = {};
        sales.forEach(sale => {
            const month = new Date(sale.createdAt).toLocaleString('default', { month: 'short' });
            revenueByMonth[month] = (revenueByMonth[month] || 0) + Number(sale.amount);
        });

        // Category Breakdown
        const categoryRevenue: Record<string, number> = {};
        sales.forEach(sale => {
            if (sale.listing?.category) {
                categoryRevenue[sale.listing.category] = (categoryRevenue[sale.listing.category] || 0) + Number(sale.amount);
            }
        });
        const mostProfitableCategory = Object.entries(categoryRevenue).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        // 3. INVENTORY OPTIMIZATION
        const listings = await prisma.listing.findMany({
            where: { sellerId: userId },
            include: { analytics: true }
        });

        const activeListings = listings.filter(l => l.status === 'ACTIVE').length;
        const soldListings = listings.filter(l => l.status === 'SOLD').length;
        const totalListings = listings.length;

        const totalViews = listings.reduce((sum, l) => sum + (l.analytics?.totalViews || 0), 0);
        const conversionRate = totalViews > 0 ? (soldListings / totalViews) * 100 : 0;

        // Days to Sell (for sold items)
        let totalDaysToSell = 0;
        let soldItemsCount = 0;
        listings.forEach(l => {
            if (l.status === 'SOLD') {
                const soldDate = new Date(l.updatedAt).getTime(); // approx
                const createdDate = new Date(l.createdAt).getTime();
                totalDaysToSell += (soldDate - createdDate);
                soldItemsCount++;
            }
        });
        const avgDaysToSell = soldItemsCount > 0 ? (totalDaysToSell / soldItemsCount) / (1000 * 60 * 60 * 24) : 0;


        // 4. CUSTOMER INSIGHTS
        // Get unique buyers from Sold listings (approximated via Conversations or Transactions if we tracked buyerId on Transaction explicitly, 
        // but Transaction links to Wallet (Seller). 
        // Best source: Conversations marked as 'Sold' or SmartContracts.
        // Let's use SmartContracts for confirmed modern sales, and failover to Conversations if needed.
        const contracts = await (prisma as any).smartContract.findMany({
            where: { sellerId: userId, status: 'COMPLETED' },
            include: { buyer: true }
        });

        const buyers = contracts.map((c: any) => c.buyer).filter(Boolean);
        const uniqueBuyers = new Set(buyers.map((b: any) => b.id));

        // Use a generic interface to avoid 'any' if possible, or stick to 'any' for now to match other patterns
        const demographics = {
            facultyLimit: {} as Record<string, number>,
            residence: {} as Record<string, number>
        };
        buyers.forEach((b: any) => {
            if (b.faculty) demographics.facultyLimit[b.faculty] = (demographics.facultyLimit[b.faculty] || 0) + 1;
            if (b.residenceArea) demographics.residence[b.residenceArea] = (demographics.residence[b.residenceArea] || 0) + 1;
        });


        // 5. COMPETITIVE ANALYSIS (Simplified)
        // Global Market Share in their top category
        let marketShare = 0;
        if (mostProfitableCategory !== 'N/A') {
            const totalCategorySales = await prisma.listing.count({
                where: { category: mostProfitableCategory, status: 'SOLD' }
            });
            const myCategorySales = listings.filter(l => l.category === mostProfitableCategory && l.status === 'SOLD').length;
            marketShare = totalCategorySales > 0 ? (myCategorySales / totalCategorySales) * 100 : 0;
        }

        return res.json({
            performance: {
                overallRating: parseFloat(averageRating.toFixed(1)),
                totalReviews: reviews.length,
                responseRate: parseFloat(responseRate.toFixed(1)),
                avgResponseTimeHours: parseFloat(avgResponseTimeHours.toFixed(1)),
                conversionRate: parseFloat(conversionRate.toFixed(2)),
                repeatCustomerRate: parseFloat((buyers.length > 0 ? ((buyers.length - uniqueBuyers.size) / buyers.length) * 100 : 0).toFixed(1))
            },
            financials: {
                totalRevenue,
                netProfit,
                platformFeesPaid: totalFees,
                salesCount: sales.length,
                mostProfitableCategory,
                revenueTrend: revenueByMonth
            },
            inventory: {
                totalListings,
                activeListings,
                soldListings,
                avgDaysToSell: parseFloat(avgDaysToSell.toFixed(1)),
                turnoverRate: totalListings > 0 ? parseFloat((soldListings / totalListings * 100).toFixed(1)) : 0,
                stockValue: listings.filter(l => l.status === 'ACTIVE').reduce((sum, l) => sum + Number(l.price), 0)
            },
            customers: {
                totalUniqueBuyers: uniqueBuyers.size,
                topFaculties: Object.entries(demographics.facultyLimit).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]),
                topLocations: Object.entries(demographics.residence).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0])
            },
            competition: {
                marketShareInTopCategory: parseFloat(marketShare.toFixed(2)),
                priceCompetitiveness: "High" // Hardcoded for MVP, real logic requires complex aggregations
            }
        });

    } catch (error) {
        return handleControllerError(res, error, 'GetSellerAnalytics');
    }
};
