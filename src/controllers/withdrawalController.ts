import type { Response } from 'express';
import prisma from '../prisma.js';
import bcrypt from 'bcryptjs';
import { setupPinSchema, verifyPinSchema, withdrawalSchema } from '../validations/withdrawalValidation.js';
import { handleControllerError } from './authController.js';
import logger from '../utils/logger.js';

const WITHDRAWAL_FEE_PERCENTAGE = 0.015; // 1.5% fee
const MIN_WITHDRAWAL_FEE = 50; // Minimum ₦50 fee

export const setupPin = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const validatedData = setupPinSchema.parse(req.body);
        const { newPin, currentPin } = validatedData;

        const wallet = await prisma.wallet.findUnique({
            where: { userId },
        }) as any;

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        // If PIN exists, verify current PIN
        if (wallet.transactionPin) {
            if (!currentPin) {
                return res.status(400).json({ message: 'Current PIN is required to change PIN' });
            }

            const isValid = await bcrypt.compare(currentPin, wallet.transactionPin);
            if (!isValid) {
                return res.status(401).json({ message: 'Current PIN is incorrect' });
            }
        }

        // Hash and save new PIN
        const hashedPin = await bcrypt.hash(newPin, 10);
        await (prisma.wallet as any).update({
            where: { userId },
            data: {
                transactionPin: hashedPin,
                pinSetAt: new Date(),
            },
        });

        logger.info('Transaction PIN Updated', { userId });
        return res.json({ message: 'Transaction PIN updated successfully' });
    } catch (error) {
        return handleControllerError(res, error, 'SetupPin');
    }
};

export const verifyPin = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const validatedData = verifyPinSchema.parse(req.body);
        const { pin } = validatedData;

        const wallet = await prisma.wallet.findUnique({
            where: { userId },
        }) as any;

        if (!wallet || !wallet.transactionPin) {
            return res.status(400).json({ message: 'Transaction PIN not set' });
        }

        const isValid = await bcrypt.compare(pin, wallet.transactionPin);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid PIN' });
        }

        return res.json({ message: 'PIN verified successfully', valid: true });
    } catch (error) {
        return handleControllerError(res, error, 'VerifyPin');
    }
};

export const initiateWithdrawal = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const validatedData = withdrawalSchema.parse(req.body);
        const { amount, bankCode, accountNumber, accountName, pin } = validatedData;

        // Get wallet and verify PIN
        const wallet = await prisma.wallet.findUnique({
            where: { userId },
        }) as any;

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        if (!wallet.transactionPin) {
            return res.status(400).json({ message: 'Please set up a transaction PIN first' });
        }

        // Verify PIN
        const isPinValid = await bcrypt.compare(pin, wallet.transactionPin);
        if (!isPinValid) {
            logger.warn('Withdrawal Failed: Invalid PIN', { userId });
            return res.status(401).json({ message: 'Invalid transaction PIN' });
        }

        // Calculate fee
        const fee = Math.max(amount * WITHDRAWAL_FEE_PERCENTAGE, MIN_WITHDRAWAL_FEE);
        const netAmount = amount - fee;

        // Check available balance
        const availableBalance = Number(wallet.balance) - Number(wallet.reservedBalance || 0);
        if (availableBalance < amount) {
            return res.status(400).json({
                message: 'Insufficient balance',
                available: availableBalance,
                required: amount,
            });
        }

        // Create withdrawal request
        const withdrawal = await (prisma as any).withdrawal.create({
            data: {
                walletId: wallet.id,
                amount,
                bankCode,
                accountNumber,
                accountName,
                fee,
                netAmount,
                status: 'PENDING',
                reference: `WD_${Date.now()}_${userId.substring(0, 8)}`,
            },
        });

        // Deduct from wallet balance
        await prisma.wallet.update({
            where: { userId },
            data: {
                balance: {
                    decrement: amount,
                },
            },
        });

        // Create transaction record
        await prisma.transaction.create({
            data: {
                walletId: wallet.id,
                amount: -amount,
                type: 'WITHDRAWAL',
                status: 'PENDING',
                reference: withdrawal.reference,
            },
        });

        logger.info('Withdrawal Initiated', {
            userId,
            withdrawalId: withdrawal.id,
            amount,
            netAmount,
        });

        return res.status(202).json({
            withdrawalId: withdrawal.id,
            status: 'PENDING',
            amount,
            fee,
            netAmount,
            estimatedCompletion: '24-48 hours',
            message: 'Withdrawal request submitted successfully',
        });
    } catch (error) {
        return handleControllerError(res, error, 'InitiateWithdrawal');
    }
};

export const getWithdrawals = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const wallet = await prisma.wallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        const withdrawals = await (prisma as any).withdrawal.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
        });

        return res.json({ withdrawals });
    } catch (error) {
        return handleControllerError(res, error, 'GetWithdrawals');
    }
};
