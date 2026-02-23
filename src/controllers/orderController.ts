import type { Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';
import logger from '../utils/logger.js';
import { getIO } from '../socket.js';

// Platform fee configuration (5% default, can be disabled via env)
const PLATFORM_FEE_ENABLED = process.env['PLATFORM_FEE_ENABLED'] !== 'false'; // Default: true
const PLATFORM_FEE_PERCENTAGE = Number(process.env['PLATFORM_FEE_PERCENTAGE'] || 0.05); // 5% default

export const getSellerOrders = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const orders = await (prisma.transaction as any).findMany({
            where: {
                type: 'PURCHASE',
                listing: { sellerId: userId },
                escrowStatus: { in: ['HELD', 'DELIVERED', 'RECEIVED'] }
            },
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        images: { take: 1, where: { isPrimary: true } }
                    }
                },
                wallet: {
                    include: {
                        user: {
                            select: { id: true, fullName: true, phoneNumber: true, email: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ orders });
    } catch (error) {
        return handleControllerError(res, error, 'GetSellerOrders');
    }
};

export const getBuyerOrders = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        const orders = await (prisma.transaction as any).findMany({
            where: {
                walletId: wallet.id,
                type: 'PURCHASE',
                escrowStatus: { in: ['HELD', 'DELIVERED', 'RECEIVED'] }
            },
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        images: { take: 1, where: { isPrimary: true } },
                        seller: {
                            select: { id: true, fullName: true, phoneNumber: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ orders });
    } catch (error) {
        return handleControllerError(res, error, 'GetBuyerOrders');
    }
};

export const markAsDelivered = async (req: any, res: Response) => {
    const { transactionId } = req.params;
    const sellerId = req.user.id;

    try {
        const transaction = await (prisma.transaction as any).findUnique({
            where: { id: transactionId },
            include: { listing: true, wallet: true }
        });

        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        if (transaction.listing?.sellerId !== sellerId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (transaction.escrowStatus !== 'HELD') {
            return res.status(400).json({ message: 'Can only mark held transactions as delivered' });
        }

        const updated = await (prisma.transaction as any).update({
            where: { id: transactionId },
            data: {
                escrowStatus: 'DELIVERED',
                deliveredAt: new Date(),
                deliveredBy: sellerId
            }
        });

        // Notify buyer
        await (prisma.notification as any).create({
            data: {
                userId: transaction.wallet.userId,
                type: 'TRANSACTION',
                title: 'Order Delivered',
                body: `Your order for "${transaction.listing?.title}" has been marked as delivered. Please confirm receipt to release payment.`,
                data: { transactionId }
            }
        });

        // Emit socket event
        getIO().to(`user_${transaction.wallet.userId}`).emit('order_delivered', {
            transactionId,
            listingTitle: transaction.listing?.title
        });

        logger.info('Order marked as delivered', { transactionId, sellerId });
        res.json(updated);
    } catch (error) {
        return handleControllerError(res, error, 'MarkAsDelivered');
    }
};

export const confirmReceipt = async (req: any, res: Response) => {
    const { transactionId } = req.params;
    const buyerId = req.user.id;

    try {
        const transaction = await (prisma.transaction as any).findUnique({
            where: { id: transactionId },
            include: { listing: true, wallet: true }
        });

        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        if (transaction.wallet.userId !== buyerId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (transaction.escrowStatus !== 'DELIVERED') {
            return res.status(400).json({ message: 'Can only confirm delivered orders' });
        }

        // Update transaction and release escrow
        let platformFeeDeducted = 0;
        let sellerNetAmount = 0;
        
        const result = await (prisma.$transaction as any)(async (tx: any) => {
            // Mark as received and COMPLETE the transaction
            const txn = await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'SUCCESS',
                    escrowStatus: 'RECEIVED',
                    receivedAt: new Date(),
                    receivedBy: buyerId
                }
            });

            // Get seller wallet
            const sellerWallet = await tx.wallet.findUnique({
                where: { userId: transaction.listing!.sellerId }
            });

            if (!sellerWallet) throw new Error('Seller wallet not found');

            // Calculate platform fee
            const saleAmount = transaction.amount;
            const platformFee = PLATFORM_FEE_ENABLED ? saleAmount * PLATFORM_FEE_PERCENTAGE : 0;
            const netAmount = saleAmount - platformFee;
            
            // Store for response
            platformFeeDeducted = Number(platformFee.toFixed(2));
            sellerNetAmount = Number(netAmount.toFixed(2));

            // Release funds to seller (with fee deduction)
            await tx.wallet.update({
                where: { id: sellerWallet.id },
                data: {
                    balance: { increment: netAmount }
                }
            });

            // Deduct buyer's reserved balance (now that funds are released)
            await tx.wallet.update({
                where: { id: transaction.walletId },
                data: {
                    reservedBalance: { decrement: saleAmount }
                }
            });

            // Create sale transaction for seller (net amount)
            await tx.transaction.create({
                data: {
                    walletId: sellerWallet.id,
                    amount: netAmount,
                    type: 'SALE',
                    status: 'SUCCESS',
                    description: `Sale of "${transaction.listing?.title}"`,
                    listingId: transaction.listingId,
                    escrowStatus: 'RELEASED'
                }
            });

            // Create transaction record for platform fee
            if (PLATFORM_FEE_ENABLED && platformFee > 0) {
                const platformWallet = await tx.wallet.findFirst({
                    where: { user: { email: 'platform@campusswap.local' } }
                });

                if (platformWallet) {
                    await tx.wallet.update({
                        where: { id: platformWallet.id },
                        data: {
                            balance: { increment: platformFee }
                        }
                    });
                }
            }

            // Mark listing as sold only if all items are sold
            const newSoldCount = (transaction.listing?.soldCount || 0) + 1;
            const totalQuantity = transaction.listing?.quantity || 1; // Safety default
            const isFullySold = newSoldCount >= totalQuantity;

            await tx.listing.update({
                where: { id: transaction.listingId! },
                data: {
                    status: isFullySold ? 'SOLD' : 'ACTIVE',
                    soldCount: { increment: 1 }
                }
            });

            return txn;
        });

        // Notify seller
        await (prisma.notification as any).create({
            data: {
                userId: transaction.listing!.sellerId,
                type: 'TRANSACTION',
                title: 'Payment Released',
                body: `Buyer confirmed receipt of "${transaction.listing?.title}". ₦${sellerNetAmount} has been added to your wallet.`,
                data: { transactionId }
            }
        });

        // Emit socket events
        getIO().to(`user_${transaction.listing!.sellerId}`).emit('payment_released', {
            transactionId,
            amount: sellerNetAmount,
            platformFeeDeducted
        });

        getIO().to(`user_${transaction.listing!.sellerId}`).emit('BALANCE_UPDATE', {
            balance: 'updated'
        });

        logger.info('Receipt confirmed, escrow released', {
            transactionId,
            buyerId,
            saleAmount: Number(transaction.amount.toFixed(2)),
            platformFeeEnabled: PLATFORM_FEE_ENABLED,
            platformFeePercentage: `${PLATFORM_FEE_PERCENTAGE * 100}%`,
            platformFeeDeducted,
            sellerNetAmount
        });
        
        res.json({
            message: 'Receipt confirmed. Funds released to seller.',
            transactionId,
            status: result.status,
            escrowStatus: result.escrowStatus,
            saleAmount: Number(transaction.amount.toFixed(2)),
            platformFeeDeducted,
            sellerNetAmount,
            platformFeeEnabled: PLATFORM_FEE_ENABLED
        });
    } catch (error) {
        return handleControllerError(res, error, 'ConfirmReceipt');
    }
};
