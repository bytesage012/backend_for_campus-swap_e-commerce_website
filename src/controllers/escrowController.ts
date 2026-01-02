import type { Response } from 'express';
import prisma from '../prisma.js';
import { confirmReceiptSchema, disputeSchema } from '../validations/escrowValidation.js';
import { handleControllerError } from './authController.js';
import logger from '../utils/logger.js';

export const confirmReceipt = async (req: any, res: Response) => {
    const userId = req.user.id;
    const transactionId = req.params.id;

    try {
        const validatedData = confirmReceiptSchema.parse(req.body);
        const { received, conditionMet, notes } = validatedData;

        // Get transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                wallet: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Verify buyer is confirming
        if (transaction.wallet.userId !== userId) {
            return res.status(403).json({ message: 'Only the buyer can confirm receipt' });
        }

        if (transaction.status !== 'PENDING' && transaction.status !== 'SUCCESS') {
            return res.status(400).json({ message: 'Transaction cannot be confirmed' });
        }

        if (!received || !conditionMet) {
            // Buyer is disputing - handle separately
            return res.status(400).json({
                message: 'Please use the dispute endpoint if item was not received or condition not met',
            });
        }

        // Mark transaction as confirmed
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'SUCCESS',
            },
        });

        // TODO: Release escrowed funds to seller
        // This would involve finding the listing, getting seller's wallet, and transferring funds

        logger.info('Receipt Confirmed', { transactionId, userId, notes });
        res.json({
            message: 'Receipt confirmed successfully',
            status: 'COMPLETED',
        });
    } catch (error) {
        return handleControllerError(res, error, 'ConfirmReceipt');
    }
};

export const disputeTransaction = async (req: any, res: Response) => {
    const userId = req.user.id;
    const transactionId = req.params.id;

    try {
        const validatedData = disputeSchema.parse(req.body);
        const { reason, evidence } = validatedData;

        // Get transaction
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                wallet: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Verify buyer is disputing
        if (transaction.wallet.userId !== userId) {
            return res.status(403).json({ message: 'Only the buyer can dispute a transaction' });
        }

        // Mark transaction as disputed
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'FAILED', // Using FAILED status for disputes temporarily
            },
        });

        // TODO: Create a proper Dispute model and record
        // For now, just log it
        logger.warn('Transaction Disputed', {
            transactionId,
            userId,
            reason,
            evidence,
        });

        res.json({
            message: 'Dispute submitted successfully',
            status: 'UNDER_REVIEW',
            estimatedResolution: '3-5 business days',
        });
    } catch (error) {
        return handleControllerError(res, error, 'DisputeTransaction');
    }
};
