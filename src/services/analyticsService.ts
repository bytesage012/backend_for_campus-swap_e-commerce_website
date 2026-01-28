import prisma from '../prisma.js';
import logger from '../utils/logger.js';

export const AnalyticsService = {
    /**
     * Ingests an analytics event.
     * Designed to be easily swapped with a Kafka Producer in the future.
     */
    async trackEvent(data: {
        userId?: string;
        sessionId?: string;
        eventType: string;
        metadata?: any;
    }) {
        try {
            // In a real-scale scenario, this would push to Kafka/Redis Stream.
            // For now, we write directly to Postgres (Hypertable pattern).
            await prisma.analyticsEvent.create({
                data: {
                    userId: data.userId || null,
                    sessionId: data.sessionId || null,
                    eventType: data.eventType,
                    metadata: data.metadata || {},
                },
            });

            // If this is a Listing View event, update the aggregated ListingAnalytics
            if ((data.eventType === 'VIEW' || data.eventType === 'VIEW_LISTING') && data.metadata?.listingId) {
                await prisma.listingAnalytics.upsert({
                    where: { listingId: data.metadata.listingId },
                    create: {
                        listingId: data.metadata.listingId,
                        totalViews: 1,
                        lastViewedAt: new Date(),
                    },
                    update: {
                        totalViews: { increment: 1 },
                        lastViewedAt: new Date(),
                    },
                });
            }
        } catch (error) {
            // Analytics should generally be "fire and forget" and not block the main flow
            // But we log errors.
            logger.error('Failed to track analytics event', error);
        }
    },

    /**
     * Aggregates User Acquisition Funnel Metrics.
     * Visitor -> Signup -> Verification -> First Listing -> First Sale
     */
    async getFunnelMetrics(startDate: Date, endDate: Date) {
        const [visitors, signups, verifications, listings, sales] = await Promise.all([
            // Approximating visitors based on unique sessionIds from 'VISIT' events
            prisma.analyticsEvent.groupBy({
                by: ['sessionId'],
                where: {
                    eventType: 'VISIT',
                    createdAt: { gte: startDate, lte: endDate },
                },
            }).then(res => res.length),

            prisma.user.count({
                where: { createdAt: { gte: startDate, lte: endDate } },
            }),

            prisma.verification.count({
                where: {
                    status: 'APPROVED',
                    updatedAt: { gte: startDate, lte: endDate }
                },
            }),

            prisma.listing.groupBy({
                by: ['sellerId'],
                where: {
                    createdAt: { gte: startDate, lte: endDate }
                },
            }).then(res => res.length), // Unique sellers who listed

            prisma.transaction.groupBy({
                by: ['walletId'], // Approximation: Unique sellers who received money
                where: {
                    type: 'SALE',
                    status: 'SUCCESS',
                    createdAt: { gte: startDate, lte: endDate }
                }
            }).then(res => res.length)
        ]);

        return {
            visitors,
            signups,
            verifications,
            firstListings: listings,
            firstSales: sales,
            conversionRates: {
                visitorToSignup: visitors > 0 ? (signups / visitors) * 100 : 0,
                signupToVerification: signups > 0 ? (verifications / signups) * 100 : 0,
                verificationToListing: verifications > 0 ? (listings / verifications) * 100 : 0,
                listingToSale: listings > 0 ? (sales / listings) * 100 : 0
            }
        };
    },

    /**
     * Calculates Network Effects Metrics.
     * Viral Coefficient: Average number of referrals per user.
     */
    async getNetworkMetrics() {
        const totalUsers = await prisma.user.count();
        const usersWithReferrals = await prisma.user.count({
            where: {
                referrals: { some: {} }
            }
        });

        // This is a simplified calculation. Real viral coefficient K = i * c
        // where i = invitations sent per user, c = conversion rate of invitation.
        // Here we measure 'Realized K' = Total Referrals / Total Users (base) is tricky without time.
        // Simple proxy: % of users who refer others.

        return {
            userCount: totalUsers,
            activeReferrers: usersWithReferrals,
            viralCoefficientProxy: totalUsers > 0 ? usersWithReferrals / totalUsers : 0
        };
    },

    /**
     * Calculates Liquidity Metrics.
     * Bid-Ask Spread and Market Velocity.
     */
    async getLiquidityMetrics(startDate: Date, endDate: Date) {
        // Market Depth: Count of active listings vs active bids (MarketOffers)
        const activeListings = await prisma.listing.count({ where: { status: 'ACTIVE' } });
        const activeBids = await prisma.marketOffer.count({ where: { status: 'PENDING' } });

        // Velocity: Sold items / Active items (Turnover)
        const soldItems = await prisma.listing.count({
            where: {
                status: 'SOLD',
                updatedAt: { gte: startDate, lte: endDate }
            }
        });

        // Volume
        const volume = await prisma.transaction.aggregate({
            where: {
                type: 'SALE',
                status: 'SUCCESS',
                createdAt: { gte: startDate, lte: endDate }
            },
            _sum: { amount: true }
        });

        return {
            marketDepth: {
                listings: activeListings,
                bids: activeBids,
                ratio: activeListings > 0 ? activeBids / activeListings : 0
            },
            velocity: activeListings > 0 ? (soldItems / activeListings) * 100 : 0,
            volume: volume._sum.amount || 0
        };
    },

    /**
     * Product Market Fit (NPS)
     */
    async getPMFMetrics() {
        const surveys = await prisma.nPSSurvey.findMany({
            select: { score: true }
        });

        if (surveys.length === 0) return { nps: 0, respondentCount: 0 };

        const promoters = surveys.filter(s => s.score >= 9).length;
        const detractors = surveys.filter(s => s.score <= 6).length;
        const total = surveys.length;

        const nps = ((promoters - detractors) / total) * 100;

        return {
            nps: Math.round(nps * 10) / 10,
            respondentCount: total,
            breakdown: { promoters, detractors, passives: total - promoters - detractors }
        };
    }
};
