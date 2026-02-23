import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

describe('Review & Reputation Endpoints', () => {
    let buyerToken: string;
    let sellerToken: string;
    let sellerId: string;
    let transactionId: string;
    const JWT_SECRET = process.env['JWT_SECRET'] || 'secret';

    beforeAll(async () => {
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

        const seller = await prisma.user.create({
            data: {
                email: 'seller-review@unn.edu.ng',
                password: 'password123',
                fullName: 'Seller Review',
                wallet: { create: { balance: 0 } },
            },
        });
        sellerId = seller.id;
        sellerToken = jwt.sign({ id: seller.id }, JWT_SECRET);

        const buyer = await prisma.user.create({
            data: {
                email: 'buyer-review@unn.edu.ng',
                password: 'password123',
                fullName: 'Buyer Review',
                wallet: { create: { balance: 5000 } },
            },
        });
        buyerToken = jwt.sign({ id: buyer.id }, JWT_SECRET);

        // Create a transaction to review
        const wallet = await prisma.wallet.findUnique({ where: { userId: buyer.id } });
        const tx = await prisma.transaction.create({
            data: {
                walletId: wallet!.id,
                amount: 1000,
                type: 'PURCHASE',
                status: 'SUCCESS',
            }
        });
        transactionId = tx.id;
    });

    afterAll(async () => {
        // Shared connection maintained
    });

    describe('POST /api/transactions/:id/review', () => {
        it('should submit a review for a transaction', async () => {
            const res = await request(app)
                .post(`/api/transactions/${transactionId}/review`)
                .set('Authorization', `Bearer ${buyerToken}`)
                .send({
                    rating: 5,
                    comment: 'Great seller!',
                    targetId: sellerId // The user being reviewed
                });

            expect(res.status).toBe(201);
            expect(res.body.reviewId).toBeDefined();
        });

        it('should fail if rating is invalid', async () => {
            const res = await request(app)
                .post(`/api/transactions/${transactionId}/review`)
                .set('Authorization', `Bearer ${buyerToken}`)
                .send({
                    rating: 6,
                    targetId: sellerId
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/users/:id/reviews', () => {
        it('should get reviews for a user', async () => {
            const res = await request(app)
                .get(`/api/users/${sellerId}/reviews`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.reviews)).toBe(true);
            expect(res.body.totalReviews).toBeGreaterThan(0);
        });
    });

    describe('GET /api/users/:id/rating-summary', () => {
        it('should get rating summary for a user', async () => {
            const res = await request(app)
                .get(`/api/users/${sellerId}/rating-summary`);

            expect(res.status).toBe(200);
            expect(res.body.overall.average).toBeDefined();
        });
    });
});
