import type { Request, Response } from 'express';
import prisma from '../prisma.js';

const handleControllerError = (res: Response, error: any, context: string) => {
    console.error(`${context} Error:`, error);
    res.status(500).json({ message: 'Server error', error: error.message || error });
};

export const getBalance = async (req: any, res: Response) => {
    try {
        const wallet = await prisma.wallet.findUnique({
            where: { userId: req.user.id },
        });
        if (!wallet) {
            // Lazy creation for users who registered before wallet module existed
            const newWallet = await prisma.wallet.create({
                data: {
                    userId: req.user.id,
                    balance: 0,
                    reservedBalance: 0
                }
            });
            return res.json({ balance: Number(newWallet.balance) });
        }

        res.json({ balance: Number(wallet.balance) });
    } catch (error) {
        handleControllerError(res, error, 'GetBalance');
    }
};

export const getTransactions = async (req: any, res: Response) => {
    try {
        let wallet = await prisma.wallet.findUnique({
            where: { userId: req.user.id },
        });

        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: {
                    userId: req.user.id,
                    balance: 0,
                    reservedBalance: 0
                }
            });
        }

        const transactions = await prisma.transaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
        });

        res.json(transactions.map(t => ({
            ...t,
            amount: Number(t.amount)
        })));
    } catch (error) {
        handleControllerError(res, error, 'GetTransactions');
    }
};
