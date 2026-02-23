import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { handleControllerError } from './authController.js';

export const getPlatformGrowthMetrics = async (req: Request, res: Response) => {
    try {
        const period = req.query['period'] as string || '30d';
        let startDate = new Date();
        const endDate = new Date();

        if (period === '30d') {
            startDate.setDate(startDate.getDate() - 30);
        } else if (period === '90d') {
            startDate.setDate(startDate.getDate() - 90);
        } else if (period === '1y') {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }

        // 1. User Acquisition Funnel
        const funnel = await AnalyticsService.getFunnelMetrics(startDate, endDate);

        // 2. Network Effects
        const network = await AnalyticsService.getNetworkMetrics();

        // 3. Market Liquidity
        const liquidity = await AnalyticsService.getLiquidityMetrics(startDate, endDate);

        // 4. Geographic/Demographic Expansion
        // Group users by residenceArea and faculty to see concentration
        const geoDistribution = await prisma.user.groupBy({
            by: ['residenceArea'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        });

        const facultyPenetration = await prisma.user.groupBy({
            by: ['faculty'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        });

        // 5. Product-Market Fit (NPS)
        const pmf = await AnalyticsService.getPMFMetrics();

        return res.json({
            period,
            funnel,
            network,
            liquidity,
            expansion: {
                topLocations: geoDistribution,
                topFaculties: facultyPenetration
            },
            pmf
        });
    } catch (error) {
        return handleControllerError(res, error, 'Failed to fetch platform growth metrics');
    }
};

export const recordAnalyticsEvent = async (req: Request, res: Response) => {
    try {
        const { eventType, metadata, sessionId } = req.body;
        // If user is logged in, attach userId. If not, rely on sessionId.
        const userId = (req as any).user?.id || req.body.userId;

        await AnalyticsService.trackEvent({
            userId,
            sessionId,
            eventType,
            metadata
        });

        return res.status(201).json({ message: 'Event recorded' });
    } catch (error) {
        // Don't fail the request if analytics fails, just log it (handled in Service)
        // But for API response, we send 200/201 to client usually.
        // If critical:
        return handleControllerError(res, error, 'Failed to record event');
    }
};
