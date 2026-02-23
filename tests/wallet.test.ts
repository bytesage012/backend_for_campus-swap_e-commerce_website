import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

describe('Wallet & Payment Endpoints', () => {
    let token: string;
    let userId: string;
    const JWT_SECRET = process.env['JWT_SECRET'] || 'secret';

    beforeAll(async () => {
        // Clean up to ensure fresh start
        await (prisma as any).adminLog.deleteMany();
        await (prisma as any).userDevice.deleteMany();
        await (prisma as any).notification.deleteMany();
        await (prisma as any).savedItem.deleteMany();
        await (prisma.message as any).deleteMany();
        await (prisma.conversation as any).deleteMany();
        await (prisma as any).review.deleteMany();
        await (prisma as any).verification.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await (prisma as any).withdrawal.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.listingImage.deleteMany();
        await (prisma as any).report.deleteMany();
        await (prisma as any).listingAnalytics.deleteMany();
        await (prisma as any).moderationLog.deleteMany();
        await (prisma as any).listingModeration.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await (prisma as any).preference.deleteMany();
        await prisma.user.deleteMany();

        const email = 'wallet-test@unn.edu.ng';
        const user = await prisma.user.create({
            data: {
                email,
                password: 'password123',
                fullName: 'Wallet Test',
                faculty: 'Arts',
                wallet: { create: { balance: 100 } },
            },
        });
        userId = user.id;
        token = jwt.sign({ id: user.id }, JWT_SECRET);
    });

    afterAll(async () => {
        // Shared connection maintained
    });

    describe('GET /api/wallet/balance', () => {
        it('should return the current wallet balance', async () => {
            const res = await request(app)
                .get('/api/wallet/balance')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.balance).toBe(100);
        });

        it('should fail without authorization', async () => {
            const res = await request(app).get('/api/wallet/balance');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/wallet/transactions', () => {
        it('should return transaction history', async () => {
            const res = await request(app)
                .get('/api/wallet/transactions')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('POST /api/payment/deposit', () => {
        it('should initialize a paystack deposit', async () => {
            const res = await request(app)
                .post('/api/payment/deposit')
                .set('Authorization', `Bearer ${token}`)
                .send({ amount: 5000 });

            // Since we use external API, we expect a successful response from our controller
            // which handles the axios call to Paystack.
            expect(res.status).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.data).toHaveProperty('authorization_url');
        });
    });

    describe('POST /api/payment/webhook', () => {
        it('should handle successful paystack payment', async () => {
            const payload = {
                event: 'charge.success',
                data: {
                    amount: 500000, // 5000 NGN in kobo
                    reference: 'test-ref-' + Date.now(),
                    metadata: {
                        userId: userId,
                    }
                }
            };

            const secret = process.env['PAYSTACK_SECRET_KEY'] || '';
            const hash = crypto
                .createHmac('sha512', secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            const res = await request(app)
                .post('/api/payment/webhook')
                .set('x-paystack-signature', hash)
                .send(payload);

            expect(res.status).toBe(200);

            // Verify balance update
            const wallet = await prisma.wallet.findUnique({ where: { userId } });
            expect(Number(wallet?.balance)).toBe(5100); // 100 original + 5000 new
        });

        it('should fail with invalid signature', async () => {
            const res = await request(app)
                .post('/api/payment/webhook')
                .set('x-paystack-signature', 'invalid-hash')
                .send({ event: 'charge.success' });

            expect(res.status).toBe(400);
        });
    });
});
