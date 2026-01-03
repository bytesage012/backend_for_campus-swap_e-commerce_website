import type { Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';
import { EscrowStatus } from '@prisma/client';

export const getEscrowDashboard = async (req: any, res: Response) => {
    try {
        // 1. Real-time Overview
        const heldTransactions = await prisma.transaction.aggregate({
            where: { escrowStatus: EscrowStatus.HELD } as any,
            _sum: { amount: true },
            _count: true,
        });

        const totalFundsHeld = heldTransactions._sum.amount || 0;

        // Calculate Average Hold Duration (for RELEASED transactions)
        const releasedTransactions = await prisma.transaction.findMany({
            where: { escrowStatus: EscrowStatus.RELEASED } as any,
            select: { createdAt: true, updatedAt: true },
        });

        let averageHoldDurationHours = 0;
        if (releasedTransactions.length > 0) {
            const totalDurationMs = releasedTransactions.reduce((acc, tx) => {
                // @ts-ignore
                return acc + (new Date(tx.updatedAt).getTime() - new Date(tx.createdAt).getTime());
            }, 0);
            averageHoldDurationHours = totalDurationMs / releasedTransactions.length / (1000 * 60 * 60);
        }

        // Disputed Funds Percentage
        const disputedTransactions = await prisma.transaction.aggregate({
            where: { escrowStatus: EscrowStatus.DISPUTED } as any,
            _sum: { amount: true },
        });

        const totalEscrowVolume = await prisma.transaction.aggregate({
            where: { escrowStatus: { in: [EscrowStatus.HELD, EscrowStatus.RELEASED, EscrowStatus.DISPUTED] } } as any,
            _sum: { amount: true }
        });

        const disputedAmount = disputedTransactions._sum.amount ? Number(disputedTransactions._sum.amount) : 0;
        const totalVolume = totalEscrowVolume._sum.amount ? Number(totalEscrowVolume._sum.amount) : 0;

        const disputedFundsPercentage = totalVolume > 0 ? (disputedAmount / totalVolume) * 100 : 0;

        // Upcoming Releases (Next 24h)
        const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const upcomingReleases = await prisma.transaction.findMany({
            where: {
                escrowStatus: EscrowStatus.HELD,
                escrowReleaseDate: {
                    lte: next24h,
                    gte: new Date(),
                },
            } as any,
            include: {
                listing: { select: { title: true } },
            },
            take: 5,
        });

        // 2. Transaction Categorization
        // Group by category (requires joining with Listing)
        const transactionsByCategoryRaw = await prisma.transaction.findMany({
            where: { escrowStatus: { not: EscrowStatus.PENDING } } as any,
            include: {
                listing: {
                    select: { category: true }
                }
            }
        });

        const categoryStats: Record<string, number> = {};
        transactionsByCategoryRaw.forEach(tx => {
            const listing = (tx as any).listing;
            const cat = listing?.category || 'Uncategorized';
            categoryStats[cat] = (categoryStats[cat] || 0) + 1;
        });

        // 3. Risk Monitoring
        const highValueThreshold = 50000;
        const highValueEscrows = await prisma.transaction.findMany({
            where: {
                escrowStatus: EscrowStatus.HELD,
                amount: { gt: highValueThreshold }
            } as any,
            include: {
                wallet: { include: { user: { select: { email: true, id: true } } } }
            }
        });

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const extendedHolds = await prisma.transaction.findMany({
            where: {
                escrowStatus: EscrowStatus.HELD,
                createdAt: { lt: sevenDaysAgo }
            } as any,
            include: { listing: { select: { title: true } } }
        });

        res.json({
            overview: {
                totalFundsHeld,
                averageHoldDurationHours: Math.round(averageHoldDurationHours * 100) / 100,
                disputedFundsPercentage: Math.round(disputedFundsPercentage * 100) / 100,
                activeEscrowCount: heldTransactions._count,
            },
            upcomingReleases,
            categorization: {
                byCategory: categoryStats
            },
            riskMonitoring: {
                highValueEscrows,
                extendedHolds
            }
        });

    } catch (error) {
        handleControllerError(res, error, 'GetEscrowDashboard');
    }
};
