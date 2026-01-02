import type { Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';
import { createReportSchema } from '../validations/reportValidation.js';

export const createReport = async (req: any, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params; // Can be userId or listingId depending on route
    const isUserReport = req.path.includes('/user/');

    try {
        const validatedData = createReportSchema.parse({
            ...req.body,
            reportedUserId: isUserReport ? id : undefined,
            reportedListingId: !isUserReport ? id : undefined,
        });

        // Verify target exists
        if (isUserReport) {
            const targetUser = await prisma.user.findUnique({ where: { id } });
            if (!targetUser) return res.status(404).json({ message: 'User not found' });
        } else {
            const targetListing = await prisma.listing.findUnique({ where: { id } });
            if (!targetListing) return res.status(404).json({ message: 'Listing not found' });
        }

        const report = await prisma.report.create({
            data: {
                reporterId: userId,
                ...validatedData,
            },
        });

        res.status(201).json({
            message: 'Report submitted successfully',
            reportId: report.id,
        });
    } catch (error) {
        return handleControllerError(res, error, 'CreateReport');
    }
};
