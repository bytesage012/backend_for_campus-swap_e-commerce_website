import type { Response } from 'express';
import prisma from '../prisma.js';
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

// Get all pending verifications
export const getPendingVerifications = async (req: any, res: Response) => {
    try {
        const verifications = await (prisma.verification as any).findMany({
            where: { status: 'PENDING' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        faculty: true,
                        department: true,
                        isVerified: true,
                        verificationLevel: true,
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        logger.info('Admin Fetched Pending Verifications', {
            adminId: req.user.id,
            count: verifications.length
        });

        return res.json({
            data: verifications,
            total: verifications.length
        });
    } catch (error) {
        return handleControllerError(res, error, 'GetPendingVerifications');
    }
};

// Get all verifications (with filters)
export const getAllVerifications = async (req: any, res: Response) => {
    try {
        const { status, userId, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const where: any = {};
        if (status) where.status = status;
        if (userId) where.userId = userId;

        const [verifications, total] = await Promise.all([
            (prisma.verification as any).findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            fullName: true,
                            faculty: true,
                            department: true,
                            isVerified: true,
                            verificationLevel: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit as string)
            }),
            (prisma.verification as any).count({ where })
        ]);

        return res.json({
            data: verifications,
            pagination: {
                total,
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                totalPages: Math.ceil(total / parseInt(limit as string))
            }
        });
    } catch (error) {
        return handleControllerError(res, error, 'GetAllVerifications');
    }
};

// Approve verification
export const approveVerification = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        // Get the verification record
        const verification = await (prisma.verification as any).findUnique({
            where: { id },
            include: { user: true }
        });

        if (!verification) {
            return res.status(404).json({ message: 'Verification not found' });
        }

        if (verification.status !== 'PENDING') {
            return res.status(400).json({
                message: `Cannot approve verification with status: ${verification.status}`
            });
        }

        // Update verification and user in a transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // Update verification status
            const updatedVerification = await tx.verification.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    adminNotes: `Approved by admin ${adminId} on ${new Date().toISOString()}`
                }
            });

            // Update user status
            const updatedUser = await tx.user.update({
                where: { id: verification.userId },
                data: {
                    isVerified: true,
                    verificationStatus: 'APPROVED',
                    verificationLevel: 'VERIFIED'
                }
            });

            return { verification: updatedVerification, user: updatedUser };
        });

        logger.info('Verification Approved', {
            adminId,
            verificationId: id,
            userId: verification.userId,
            userEmail: verification.user.email
        });

        return res.json({
            message: 'Verification approved successfully',
            verification: result.verification,
            user: {
                id: result.user.id,
                email: result.user.email,
                isVerified: result.user.isVerified,
                verificationLevel: result.user.verificationLevel
            }
        });
    } catch (error) {
        return handleControllerError(res, error, 'ApproveVerification');
    }
};

// Reject verification
export const rejectVerification = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;

        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                message: 'Rejection reason is required (minimum 10 characters)'
            });
        }

        // Get the verification record
        const verification = await (prisma.verification as any).findUnique({
            where: { id },
            include: { user: true }
        });

        if (!verification) {
            return res.status(404).json({ message: 'Verification not found' });
        }

        if (verification.status !== 'PENDING') {
            return res.status(400).json({
                message: `Cannot reject verification with status: ${verification.status}`
            });
        }

        // Update verification and user in a transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // Update verification status and store reason in adminNotes
            const updatedVerification = await tx.verification.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    adminNotes: `Rejected by admin ${adminId} on ${new Date().toISOString()}. Reason: ${reason}`
                }
            });

            // Update user status back to rejected
            const updatedUser = await tx.user.update({
                where: { id: verification.userId },
                data: {
                    verificationStatus: 'REJECTED'
                }
            });

            return { verification: updatedVerification, user: updatedUser };
        });

        logger.info('Verification Rejected', {
            adminId,
            verificationId: id,
            userId: verification.userId,
            userEmail: verification.user.email,
            reason
        });

        return res.json({
            message: 'Verification rejected',
            verification: result.verification,
            rejectionReason: reason
        });
    } catch (error) {
        return handleControllerError(res, error, 'RejectVerification');
    }
};
