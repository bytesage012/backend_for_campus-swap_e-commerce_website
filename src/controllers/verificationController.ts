import type { Response } from 'express';
import prisma from '../prisma.js';
import { uploadIdSchema } from '../validations/verificationValidation.js';
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

export const uploadId = async (req: any, res: Response) => {
    try {
        const validatedData = uploadIdSchema.parse(req.body);
        const userId = req.user.id;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        const documentFront = files?.['documentFront']?.[0];
        const documentBack = files?.['documentBack']?.[0];

        if (!documentFront) {
            return res.status(400).json({ message: 'Document front is required' });
        }

        const verification = await (prisma.verification as any).create({
            data: {
                userId,
                documentType: validatedData.documentType,
                documentFrontUrl: `/uploads/verifications/${documentFront.filename}`,
                documentBackUrl: documentBack ? `/uploads/verifications/${documentBack.filename}` : null,
                status: 'PENDING',
            },
        });

        // Update user status
        await (prisma.user as any).update({
            where: { id: userId },
            data: { verificationStatus: 'PENDING' }
        });

        logger.info('ID Documents Uploaded', { userId, verificationId: verification.id });
        return res.status(202).json({
            message: 'Verification documents submitted and pending review',
            verificationId: verification.id,
            status: 'PENDING',
        });
    } catch (error) {
        return handleControllerError(res, error, 'UploadId');
    }
};

export const getVerificationStatus = async (req: any, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                isVerified: true,
                verificationStatus: true,
                verificationLevel: true,
                badge: true,
            }
        }) as any;

        if (!user) return res.status(404).json({ message: 'User not found' });

        return res.json({
            isVerified: user.isVerified,
            status: user.verificationStatus,
            verificationLevel: user.verificationLevel,
            badge: user.badge
        });
    } catch (error) {
        return handleControllerError(res, error, 'GetVerificationStatus');
    }
};
