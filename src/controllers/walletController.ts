import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import logger from '../utils/logger.js';

const handleControllerError = (res: Response, error: any, context: string) => {
    logger.error(`${context} Error:`, error);
    return res.status(500).json({ message: 'Server error', error: error.message || error });
};

export const getBalance = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const wallet = await prisma.wallet.findUnique({
            where: { userId },
        });
        if (!wallet) {
            // Lazy creation for users who registered before wallet module existed
            const newWallet = await prisma.wallet.create({
                data: {
                    userId,
                    balance: 0,
                    reservedBalance: 0
                }
            });
            return res.json({ balance: Number(newWallet.balance) });
        }

        return res.json({ balance: Number(wallet.balance) });
    } catch (error) {
        return handleControllerError(res, error, 'GetBalance');
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        let wallet = await prisma.wallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: {
                    userId,
                    balance: 0,
                    reservedBalance: 0
                }
            });
        }

        const transactions = await prisma.transaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
        });

        return res.json(transactions.map(t => ({
            ...t,
            amount: Number(t.amount)
        })));
    } catch (error) {
        return handleControllerError(res, error, 'GetTransactions');
    }
};

export const getTransactionDetail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        if (!id) {
            return res.status(400).json({ message: 'Transaction ID is required' });
        }

        const transaction: any = await prisma.transaction.findUnique({
            where: { id },
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        images: {
                            take: 1
                        }
                    }
                },
                wallet: {
                    select: {
                        userId: true
                    }
                }
            }
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Security check: Verify ownership
        if (transaction.wallet.userId !== userId) {
            return res.status(403).json({ message: 'Unauthorized to view this transaction' });
        }

        // Convert Decimal to Number for frontend consumption
        const formattedTransaction = {
            ...transaction,
            amount: Number(transaction.amount),
            platformFee: Number(transaction.platformFee || 0)
        };

        return res.json(formattedTransaction);
    } catch (error) {
        return handleControllerError(res, error, 'GetTransactionDetail');
    }
};

export const setupPin = async (req: Request, res: Response) => {
    try {
        const { pin } = req.body;
        const userId = (req as any).user.id;

        if (!pin || !/^\d{4,6}$/.test(pin)) {
            return res.status(400).json({ message: 'PIN must be 4-6 digits' });
        }

        const wallet = await prisma.wallet.findUnique({
            where: { userId }
        });

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        // Securely hash the PIN
        const hashedPin = await bcrypt.hash(pin, 10);

        await prisma.wallet.update({
            where: { id: wallet.id },
            data: {
                transactionPin: hashedPin,
                pinSetAt: new Date()
            }
        });

        return res.json({ message: 'PIN set successfully' });
    } catch (error) {
        return handleControllerError(res, error, 'SetupPin');
    }
};

export const updatePin = async (req: Request, res: Response) => {
    try {
        const { oldPin, newPin, password } = req.body;
        const userId = (req as any).user.id;

        if (!newPin || !/^\d{4,6}$/.test(newPin)) {
            return res.status(400).json({ message: 'New PIN must be 4-6 digits' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                password: true,
                wallet: {
                    select: {
                        id: true,
                        transactionPin: true
                    }
                }
            }
        });

        if (!user || !user.wallet) {
            return res.status(404).json({ message: 'User or wallet not found' });
        }

        // 1. Verify Account Password
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Invalid account password' });
        }

        // 2. Verify Old PIN if it was set
        if (user.wallet.transactionPin) {
            if (!oldPin) {
                return res.status(400).json({ message: 'Old PIN is required to change it' });
            }
            const isPinMatch = await bcrypt.compare(oldPin, user.wallet.transactionPin);
            if (!isPinMatch) {
                return res.status(401).json({ message: 'Invalid old PIN' });
            }
        }

        // 3. Update with New Hashed PIN
        const hashedPin = await bcrypt.hash(newPin, 10);

        await prisma.wallet.update({
            where: { id: user.wallet.id },
            data: {
                transactionPin: hashedPin,
                pinSetAt: new Date()
            }
        });

        return res.json({ message: 'PIN updated successfully' });
    } catch (error) {
        return handleControllerError(res, error, 'UpdatePin');
    }
};

export const verifyPin = async (req: Request, res: Response) => {
    try {
        const { pin } = req.body;
        const userId = (req as any).user.id;
        const wallet = await prisma.wallet.findUnique({
            where: { userId }
        });

        if (!wallet || !wallet.transactionPin) {
            return res.status(400).json({ message: 'PIN not set' });
        }

        const isValid = await bcrypt.compare(pin, wallet.transactionPin);
        return res.json({ isValid });
    } catch (error) {
        return handleControllerError(res, error, 'VerifyPin');
    }
};
