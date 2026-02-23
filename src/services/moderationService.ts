import prisma from '../prisma.js';
import { ModerationStatus, ModerationAction } from '@prisma/client';
import { getIO } from '../socket.js';

export class ModerationService {
    /**
     * Calculate priority score for a listing
     * Score range: 0 to 100+
     * Factors:
     * - Reports: +10 per report, +20 if HIGH priority
     * - Seller Trust: - (TrustScore / 10)
     * - Price: +15 if < 10% of avg or > 500% (placeholder logic)
     * - Keywords: +30 for suspicious words
     * - New Seller: +20 if account < 7 days old
     */
    static async calculatePriorityScore(listingId: string): Promise<number> {
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            include: {
                seller: true,
                reports: true,
                images: true
            }
        });

        if (!listing) return 0;

        let score = 0;

        // 1. Report Factor
        listing.reports.forEach(report => {
            score += 10;
            if (report.priority === 'HIGH' || report.priority === 'URGENT') score += 20;
        });

        // 2. Seller Trust & Verification
        if (listing.seller.trustScore) {
            score -= (listing.seller.trustScore / 5);
        }
        if (!listing.seller.isVerified) {
            score += 15; // Unverified sellers are higher risk
        } else {
            score -= 10; // Verified sellers are lower risk
        }

        // 3. New Seller Factor
        const accountAge = (new Date().getTime() - new Date(listing.seller.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (accountAge < 7) score += 20;

        // 4. Content Quality
        if (listing.images.length === 0) score += 20;
        else if (listing.images.length === 1) score += 5;

        if (listing.description.length < 20) score += 10; // Very short description

        // 5. Keyword Check (Basic) - In real app, use AI or regex library
        const suspiciousKeywords = ['bank transfer', 'western union', 'crypto', 'dm for price', 'gift card'];
        const text = (listing.title + ' ' + listing.description).toLowerCase();
        if (suspiciousKeywords.some(kw => text.includes(kw))) {
            score += 30;
        }

        return Math.max(0, score);
    }

    /**
     * Add or update listing in moderation queue
     */
    static async addToQueue(listingId: string, trigger: 'AI' | 'USER_REPORT' | 'UPDATE') {
        const score = await this.calculatePriorityScore(listingId);

        const moderation = await prisma.listingModeration.upsert({
            where: { listingId },
            create: {
                listingId,
                priorityScore: score,
                status: 'PENDING',
                flaggedBy: [trigger]
            },
            update: {
                priorityScore: score,
                status: 'PENDING',
                flaggedBy: { push: trigger }
            }
        });

        // Notify admins via WebSocket if high priority
        if (score > 50) {
            const io = getIO();
            if (io) {
                io.to('admin_room').emit('moderation_alert', {
                    listingId,
                    score,
                    message: `High priority review needed for ${listingId}`
                });
            }
        }

        return moderation;
    }

    /**
     * Submit a review decision
     */
    static async submitReview(
        listingId: string,
        moderatorId: string,
        action: ModerationAction,
        reason?: string,
        notes?: string
    ) {
        return await prisma.$transaction(async (tx) => {
            // 1. Log the action
            await tx.moderationLog.create({
                data: {
                    listingId,
                    moderatorId,
                    action,
                    reason: reason || null,
                    notes: notes || null
                }
            });

            // 2. Update Moderation Status
            let status: ModerationStatus = 'PENDING';
            let listingStatus = undefined;

            switch (action) {
                case 'APPROVE':
                    status = 'APPROVED';
                    listingStatus = 'ACTIVE';
                    break;
                case 'REJECT':
                    status = 'REJECTED';
                    listingStatus = 'ARCHIVED'; // Assuming archived for rejection
                    break;
                case 'FLAG':
                    status = 'IN_REVIEW';
                    break;
                case 'REQUEST_CHANGES':
                    status = 'CHANGES_REQUESTED';
                    listingStatus = 'DRAFT';
                    break;
            }

            await tx.listingModeration.update({
                where: { listingId },
                data: {
                    status,
                    assignedToId: moderatorId
                }
            });

            // 3. Update Listing Status if applicable
            if (listingStatus) {
                await tx.listing.update({
                    where: { id: listingId },
                    data: { status: listingStatus as any }
                });
            }

            return status;
        });
    }

    static async getQueue(page = 1, limit = 50, minScore = 0) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            prisma.listingModeration.findMany({
                where: {
                    status: { in: ['PENDING', 'IN_REVIEW'] },
                    priorityScore: { gte: minScore }
                },
                include: {
                    listing: {
                        include: { seller: true, images: true }
                    }
                },
                orderBy: { priorityScore: 'desc' }, // Highest priority first
                skip,
                take: limit
            }),
            prisma.listingModeration.count({
                where: {
                    status: { in: ['PENDING', 'IN_REVIEW'] },
                    priorityScore: { gte: minScore }
                }
            })
        ]);

        return { items, total, pages: Math.ceil(total / limit) };
    }
}
