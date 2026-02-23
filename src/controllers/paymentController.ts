import axios from 'axios';
import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const PAYSTACK_SECRET = process.env['PAYSTACK_SECRET_KEY'] || '';

const handleControllerError = (res: Response, error: any, context: string) => {
    logger.error(`${context} Controller Error`, error);
    res.status(500).json({ message: 'Server error', error: error.message || error });
};

export const initializeDeposit = async (req: any, res: Response) => {
    const { amount } = req.body;
    const userId = req.user.id;

    try {
        logger.info('Initializing Deposit', { userId, amount });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            logger.warn('Deposit Failed: User not found', { userId });
            return res.status(404).json({ message: 'User not found' });
        }

        const payload = {
            email: user.email.trim().toLowerCase(),
            amount: Math.round(parseFloat(amount) * 100),
            callback_url: `${process.env['FRONTEND_URL'] || 'http://localhost:5173'}/payment/verify`,
            metadata: { userId: user.id, type: 'DEPOSIT' },
        };

        logger.info('Paystack Request Payload', payload);

        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        res.json({
            authorization_url: response.data.data.authorization_url,
            reference: response.data.data.reference
        });
    } catch (error: any) {
        handleControllerError(res, error.response?.data || error, 'PaystackInit');
    }
};

export const paystackWebhook = async (req: Request, res: Response) => {
    const signature = req.headers['x-paystack-signature'];

    const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (hash !== signature) {
        logger.warn('Invalid Paystack Signature', { received: signature });
        return res.status(400).send('Invalid signature');
    }

    const event = req.body;
    logger.info('Paystack Webhook Received', { event: event.event, reference: event.data?.reference });

    if (event.event === 'charge.success') {
        const { amount, metadata, reference } = event.data;
        const userId = metadata?.userId;

        if (!userId) {
            logger.error('Webhook Error: No userId in metadata', event.data);
            return res.status(400).send('No userId in metadata');
        }

        try {
            await prisma.$transaction(async (tx) => {
                const wallet = await tx.wallet.findUnique({ where: { userId } });
                if (!wallet) throw new Error(`Wallet not found for userId: ${userId}`);

                const updatedWallet = await tx.wallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: { increment: amount / 100 },
                    },
                });

                await tx.transaction.create({
                    data: {
                        walletId: updatedWallet.id,
                        amount: amount / 100,
                        type: 'DEPOSIT',
                        status: 'SUCCESS',
                        reference: reference,
                        description: 'Wallet deposit via Paystack',
                    },
                });
            });

            logger.info('Deposit Successful via Webhook', { userId, amount: amount / 100, reference });
            res.status(200).send('Webhook received');
        } catch (error) {
            logger.error('Webhook processing error', error);
            res.status(500).send('Error processing webhook');
        }
    } else {
        res.status(200).send('Event not handled');
    }
};

export const verifyTransaction = async (req: any, res: Response) => {
    const { reference } = req.params;
    const userId = req.user.id;

    try {
        logger.info('Verifying Paystack Transaction', { reference, userId });

        // 1. Check if transaction already exists locally to prevent double verification
        const existingTx = await prisma.transaction.findUnique({
            where: { reference }
        });

        if (existingTx) {
            logger.warn('Duplicate verification attempt', { reference });
            return res.json({ message: 'Transaction already processed', status: 'success' });
        }

        // 2. Call Paystack verify
        const paystackResponse = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`,
                },
            }
        );

        const { status, data } = paystackResponse.data;

        if (status && data.status === 'success') {
            const amountInNaira = data.amount / 100;
            const metadata = data.metadata;

            // Safety check: Ensure the transaction belongs to the requesting user
            if (metadata.userId !== userId) {
                logger.warn('Verification Security Warning: userId mismatch', {
                    requestUserId: userId,
                    metadataUserId: metadata.userId,
                    reference
                });
                return res.status(403).json({ message: 'Unauthorized transaction verification' });
            }

            // 3. Process deposit (Atomic Transaction)
            await prisma.$transaction(async (tx) => {
                // Find or Create Wallet (Lazy creation for older users)
                let wallet = await tx.wallet.findUnique({ where: { userId } });

                if (!wallet) {
                    logger.info('Wallet not found for verification, creating new wallet', { userId });
                    wallet = await tx.wallet.create({
                        data: {
                            userId,
                            balance: 0,
                            reservedBalance: 0
                        }
                    });
                }

                // Update Wallet Balance
                const updatedWallet = await tx.wallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: { increment: amountInNaira },
                    },
                });

                // Create Transaction Record
                await tx.transaction.create({
                    data: {
                        walletId: updatedWallet.id,
                        amount: amountInNaira,
                        type: 'DEPOSIT',
                        status: 'SUCCESS',
                        reference: reference, // Use Paystack reference
                        description: 'Wallet deposit via Paystack',
                    },
                });
            });

            logger.info('Transaction Verified and Credited', { reference, userId, amount: amountInNaira });

            // Fetch updated balance for response
            const finalWallet = await prisma.wallet.findUnique({ where: { userId } });

            return res.json({
                status: 'success',
                message: 'Deposit successful',
                balance: finalWallet?.balance
            });
        }

        return res.json({ status: data.status, message: 'Payment not successful yet' });

    } catch (error: any) {
        handleControllerError(res, error.response?.data || error, 'PaystackVerify');
    }
};
