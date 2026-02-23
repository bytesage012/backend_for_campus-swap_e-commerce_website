import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import { submitReviewSchema } from '../validations/verificationValidation.js';
import logger from '../utils/logger.js';
import { ZodError } from 'zod';

const handleControllerError = (res: Response, error: any, context: string) => {
    logger.error(`${context} Controller Error`, error);
    if (error instanceof ZodError) {
        return res.status(400).json({
            message: error.issues[0]?.message || 'Validation failed',
            errors: error.issues
        });
    }
    return res.status(500).json({ message: 'Server error', error: error.message || error });
};

export const submitReview = async (req: any, res: Response) => {
    const reviewerId = req.user.id;
    const { id: _transactionId } = req.params;

    try {
        const validatedData = submitReviewSchema.parse(req.body);
        const { rating, comment, targetId } = validatedData;

        // Check if review already exists for this transaction and reviewer
        // (Simplification: just checking if reviewer is one of the parties)

        // In a real system, we'd verify the transaction exists and the reviewer was the buyer/seller

        const review = await prisma.review.create({
            data: {
                reviewerId,
                targetId,
                rating,
                comment: comment ?? null,
            },
        });

        // Trigger notification for the user who received the review
        await prisma.notification.create({
            data: {
                userId: targetId,
                title: 'New Review Received',
                body: `You received a ${rating}-star review from ${req.user.fullName || 'a student'}.`,
                type: 'SYSTEM', // Or add a REVIEW type
                data: { relatedId: review.id }
            }
        });

        logger.info('Review Submitted', { reviewerId, targetId, rating });
        return res.status(201).json({
            message: 'Review submitted successfully',
            reviewId: review.id,
        });
    } catch (error) {
        return handleControllerError(res, error, 'SubmitReview');
    }
};

export const getUserReviews = async (req: Request, res: Response) => {
    const { id: userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    try {
        const reviews = await prisma.review.findMany({
            where: { targetId: userId },
            include: {
                reviewer: {
                    select: { fullName: true, avatarUrl: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json({
            userId,
            totalReviews: reviews.length,
            reviews
        });
    } catch (error) {
        return handleControllerError(res, error, 'GetUserReviews');
    }
};

export const getRatingSummary = async (req: Request, res: Response) => {
    const { id: userId } = req.params;
    try {
        const aggregations = await prisma.review.aggregate({
            where: { targetId: userId as string },
            _avg: { rating: true },
            _count: { _all: true },
        });

        return res.json({
            userId,
            overall: {
                average: (aggregations as any)._avg?.rating || 0,
                count: (aggregations as any)._count?._all || 0,
            }
        });
    } catch (error) {
        return handleControllerError(res, error, 'GetRatingSummary');
    }
};
