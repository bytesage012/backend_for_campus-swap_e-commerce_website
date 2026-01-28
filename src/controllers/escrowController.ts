import type { Response } from 'express';
import prisma from '../prisma.js';
import bcrypt from 'bcryptjs';
import { confirmReceiptSchema, disputeSchema } from '../validations/escrowValidation.js';
import { handleControllerError } from './authController.js';
import logger from '../utils/logger.js';
import { z } from 'zod';

// Platform fee configuration (5% default, can be disabled via env)
const PLATFORM_FEE_ENABLED = process.env.PLATFORM_FEE_ENABLED !== 'false'; // Default: true
const PLATFORM_FEE_PERCENTAGE = Number(process.env.PLATFORM_FEE_PERCENTAGE || 0.05); // 5% default

const initiatePurchaseSchema = z.object({
    listingId: z.string().uuid(),
    pin: z.string().regex(/^\d{4,6}$/)
});

const checkoutSchema = z.object({
    items: z.array(z.object({
        listingId: z.string().uuid(),
        quantity: z.number().int().min(1)
    })).min(1),
    pin: z.string().regex(/^\d{4,6}$/)
});

export const initiatePurchase = async (req: any, res: Response) => {
    const userId = req.user.id;
    try {
        const { listingId, pin } = initiatePurchaseSchema.parse(req.body);

        // 1. Verify Wallet & PIN
        const buyerWallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!buyerWallet) return res.status(404).json({ message: 'Wallet not found' });
        if (!buyerWallet.transactionPin) return res.status(400).json({ message: 'Transaction PIN not set' });

        const isPinValid = await bcrypt.compare(pin, buyerWallet.transactionPin);
        if (!isPinValid) {
            return res.status(403).json({
                message: 'Invalid transaction PIN',
                code: 'INVALID_TRANSACTION_PIN'
            });
        }

        // 2. Start Transaction
        await prisma.$transaction(async (tx) => {
            // Check Listing
            const listing = await tx.listing.findUnique({ where: { id: listingId } });
            if (!listing || listing.status !== 'ACTIVE') {
                throw new Error('Listing not available');
            }
            if (listing.sellerId === userId) {
                throw new Error('Cannot buy your own listing');
            }

            // Check Balance
            if (buyerWallet.balance.lessThan(listing.price)) {
                throw new Error('Insufficient funds');
            }

            // Deduct from Balance, Move to Reserved
            await tx.wallet.update({
                where: { id: buyerWallet.id },
                data: {
                    balance: { decrement: listing.price },
                    reservedBalance: { increment: listing.price }
                }
            });

            // Create Transaction
            const transaction = await tx.transaction.create({
                data: {
                    walletId: buyerWallet.id,
                    amount: listing.price,
                    type: 'PURCHASE', // Or ESCROW_HOLD
                    status: 'PENDING',
                    escrowStatus: 'HELD',
                    listingId: listing.id,
                    description: `Escrow hold for: ${listing.title}`,
                    reference: `PUR-${Date.now()}`
                }
            });

            // Mark Listing as RESERVED
            await tx.listing.update({
                where: { id: listingId },
                data: { status: 'RESERVED' }
            });

            return transaction;
        });

        res.json({ message: 'Purchase initiated successfully', status: 'SUCCESS' });

    } catch (error) {
        handleControllerError(res, error, 'InitiatePurchase');
    }
};

export const checkout = async (req: any, res: Response) => {
    const userId = req.user.id;
    try {
        const { items, pin } = checkoutSchema.parse(req.body);

        // 1. Verify Wallet & PIN
        const buyerWallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!buyerWallet) return res.status(404).json({ message: 'Wallet not found' });
        if (!buyerWallet.transactionPin) return res.status(400).json({ message: 'Transaction PIN not set' });

        const isPinValid = await bcrypt.compare(pin, buyerWallet.transactionPin);
        if (!isPinValid) {
            return res.status(403).json({
                message: 'Invalid transaction PIN',
                code: 'INVALID_TRANSACTION_PIN'
            });
        }

        // 2. Fetch all listings to calculate total and verify availability
        const listingIds = items.map(i => i.listingId);
        const listings = await prisma.listing.findMany({
            where: { id: { in: listingIds } }
        });

        const listingMap = new Map(listings.map(l => [l.id, l]));

        let totalAmount = 0;
        for (const item of items) {
            const listing = listingMap.get(item.listingId);
            if (!listing || listing.status !== 'ACTIVE') {
                throw new Error(`Item ${item.listingId} is no longer available`);
            }
            if (listing.sellerId === userId) {
                throw new Error('Cannot buy your own items');
            }
            if (listing.quantity < item.quantity) {
                throw new Error(`Insufficient stock for ${listing.title}`);
            }
            totalAmount += Number(listing.price) * item.quantity;
        }

        if (Number(buyerWallet.balance) < totalAmount) {
            throw new Error('Insufficient funds');
        }

        // 3. Process each purchase in a transaction
        await prisma.$transaction(async (tx) => {
            // Deduct total from buyer wallet
            await tx.wallet.update({
                where: { id: buyerWallet.id },
                data: {
                    balance: { decrement: totalAmount },
                    reservedBalance: { increment: totalAmount }
                }
            });

            for (const item of items) {
                const listing = listingMap.get(item.listingId)!;
                const itemTotal = Number(listing.price) * item.quantity;

                // Create Transaction
                const transaction = await tx.transaction.create({
                    data: {
                        walletId: buyerWallet.id,
                        amount: itemTotal,
                        type: 'PURCHASE',
                        status: 'PENDING',
                        escrowStatus: 'HELD',
                        listingId: listing.id,
                        description: `Checkout: ${item.quantity}x ${listing.title}`,
                        reference: `CH-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                    }
                });

                // Update Listing quantity and status
                const newQuantity = listing.quantity - item.quantity;
                await tx.listing.update({
                    where: { id: listing.id },
                    data: {
                        quantity: newQuantity,
                        status: newQuantity === 0 ? 'SOLD' : 'ACTIVE',
                        soldCount: { increment: item.quantity }
                    }
                });

                logger.info(`Checkout processed for listing ${listing.id}, quantity ${item.quantity}`);
            }
        });

        res.json({ message: 'Checkout successful', status: 'SUCCESS' });

    } catch (error) {
        handleControllerError(res, error, 'Checkout');
    }
};

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

        // Release escrowed funds to seller
        try {
            let feeDeducted = 0;
            let sellerNetAmount = 0;
            
            await prisma.$transaction(async (tx) => {
                // Update transaction status
                const updatedTransaction = await tx.transaction.update({
                    where: { id: transactionId },
                    data: {
                        status: 'SUCCESS',
                        escrowStatus: 'RELEASED',
                    },
                    include: { listing: true },
                });

                if (!updatedTransaction.listing) {
                    throw new Error('Listing not found for transaction');
                }

                // Get seller's wallet
                const sellerWallet = await tx.wallet.findUnique({
                    where: { userId: updatedTransaction.listing.sellerId },
                });

                if (!sellerWallet) {
                    throw new Error('Seller wallet not found');
                }

                // Transfer escrowed amount to seller
                const saleAmount = updatedTransaction.amount;
                const platformFee = PLATFORM_FEE_ENABLED ? saleAmount.mul(PLATFORM_FEE_PERCENTAGE) : new (saleAmount.constructor as any)(0);
                const netAmount = saleAmount.minus(platformFee);
                
                // Store for response
                feeDeducted = Number(platformFee.toFixed(2));
                sellerNetAmount = Number(netAmount.toFixed(2));

                // Credit seller
                await tx.wallet.update({
                    where: { id: sellerWallet.id },
                    data: {
                        balance: { increment: netAmount },
                    },
                });

                // Create transaction record for seller
                await tx.transaction.create({
                    data: {
                        walletId: sellerWallet.id,
                        amount: netAmount,
                        type: 'SALE',
                        status: 'SUCCESS',
                        description: `Sale proceeds from listing: ${updatedTransaction.listing.title}`,
                        reference: `SALE-${transactionId}`,
                    },
                });

                // Create transaction record for platform fee
                const platformWallet = await tx.wallet.findFirst({
                    where: { user: { email: 'platform@campusswap.local' } },
                });

                if (platformWallet && PLATFORM_FEE_ENABLED && platformFee.greaterThan(0)) {
                    await tx.wallet.update({
                        where: { id: platformWallet.id },
                        data: {
                            balance: { increment: platformFee },
                        },
                    });
                }
            });

            logger.info('Receipt Confirmed and Funds Released', {
                transactionId,
                userId,
                platformFeeEnabled: PLATFORM_FEE_ENABLED,
                platformFeePercentage: `${PLATFORM_FEE_PERCENTAGE * 100}%`,
                platformFeeDeducted: feeDeducted,
                sellerNetAmount,
                notes,
                timestamp: new Date().toISOString(),
            });

            res.json({
                message: 'Receipt confirmed successfully. Funds released to seller.',
                status: 'COMPLETED',
                transactionId,
                platformFeeDeducted: feeDeducted,
                sellerNetAmount,
                platformFeeEnabled: PLATFORM_FEE_ENABLED,
            });
        } catch (releaseError) {
            logger.error('Error releasing escrow funds', {
                transactionId,
                error: releaseError instanceof Error ? releaseError.message : String(releaseError),
            });
            throw releaseError;
        }
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

        // Create a proper Dispute record
        const dispute = await prisma.dispute.create({
            data: {
                transactionId,
                initiatorId: userId,
                reason,
                evidence: evidence || null,
                status: 'OPEN',
                createdAt: new Date(),
            },
            include: {
                transaction: {
                    include: { listing: true },
                },
                initiator: {
                    select: { id: true, email: true, fullName: true },
                },
            },
        });

        // Mark transaction as disputed
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'PENDING',
                escrowStatus: 'DISPUTED',
            },
        });

        // Create notification for seller
        if (dispute.transaction.listing) {
            await prisma.notification.create({
                data: {
                    userId: dispute.transaction.listing.sellerId,
                    title: 'Transaction Dispute',
                    body: `A dispute has been filed for transaction on listing: ${dispute.transaction.listing.title}`,
                    type: 'DISPUTE',
                    data: { relatedId: transactionId },
                },
            });
        }

        logger.warn('Transaction Dispute Created', {
            disputeId: dispute.id,
            transactionId,
            initiatorId: userId,
            reason,
            timestamp: new Date().toISOString(),
        });

        res.status(201).json({
            message: 'Dispute submitted successfully. Admin will review within 3-5 business days.',
            disputeId: dispute.id,
            status: 'UNDER_REVIEW',
            estimatedResolution: '3-5 business days',
            dispute,
        });
    } catch (error) {
        return handleControllerError(res, error, 'DisputeTransaction');
    }
};
