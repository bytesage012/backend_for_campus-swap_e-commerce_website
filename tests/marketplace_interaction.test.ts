import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

describe('Marketplace Interaction Endpoints', () => {
    let sellerToken: string;
    let buyerToken: string;
    let sellerId: string;
    let buyerId: string;
    let listingId: string;
    const JWT_SECRET = process.env['JWT_SECRET'] || 'secret';

    beforeAll(async () => {
        // Clean up
        await (prisma as any).adminLog.deleteMany();
        await (prisma as any).userDevice.deleteMany();
        await (prisma as any).notification.deleteMany();
        await (prisma as any).savedItem.deleteMany();
        await (prisma.message as any).deleteMany();
        await (prisma.conversation as any).deleteMany();
        await (prisma as any).review.deleteMany();
        await (prisma as any).verification.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.listingImage.deleteMany();
        await (prisma as any).report.deleteMany();
        await (prisma as any).listingAnalytics.deleteMany();
        await (prisma as any).moderationLog.deleteMany();
        await (prisma as any).listingModeration.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await (prisma as any).withdrawal.deleteMany();
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await (prisma as any).preference.deleteMany();
        await prisma.user.deleteMany();

        const seller = await prisma.user.create({
            data: {
                email: 'seller@unn.edu.ng',
                password: 'password123',
                fullName: 'Seller User',
                faculty: 'Arts',
                wallet: { create: { balance: 0 } },
            },
        });
        sellerId = seller.id;
        sellerToken = jwt.sign({ id: seller.id }, JWT_SECRET);

        const buyer = await prisma.user.create({
            data: {
                email: 'buyer@unn.edu.ng',
                password: 'password123',
                fullName: 'Buyer User',
                faculty: 'Sciences',
                wallet: { create: { balance: 5000 } }, // Give buyer some money
            },
        });
        buyerId = buyer.id;
        buyerToken = jwt.sign({ id: buyer.id }, JWT_SECRET);

        const listing = await prisma.listing.create({
            data: {
                title: 'Textbook for Sale',
                description: 'Good condition',
                price: 2000,
                category: 'Books',
                condition: 'USED',
                sellerId: sellerId,
                status: 'ACTIVE',
            },
        });
        listingId = listing.id;
    });

    afterAll(async () => {
        // Shared connection maintained
    });

    describe('POST /api/listings/:id/purchase', () => {
        it('should purchase a listing successfully using wallet', async () => {
            const res = await request(app)
                .post(`/api/listings/${listingId}/purchase`)
                .set('Authorization', `Bearer ${buyerToken}`)
                .send({
                    paymentMethod: 'WALLET',
                    useEscrow: true,
                });

            expect(res.status).toBe(200);
            expect(res.body.transactionId).toBeDefined();
            expect(res.body.escrowEnabled).toBe(true);

            // Check buyer balance (should be 5000 - 2000 = 3000)
            const buyerWallet = await prisma.wallet.findUnique({ where: { userId: buyerId } });
            expect(Number(buyerWallet?.balance)).toBe(3000);

            // Check listing status
            const listing = await prisma.listing.findUnique({ where: { id: listingId } });
            expect(listing?.status).toBe('SOLD');
        });

        it('should fail if balance is insufficient', async () => {
            const poorBuyer = await prisma.user.create({
                data: {
                    email: 'poor@unn.edu.ng',
                    password: 'password123',
                    fullName: 'Poor Buyer',
                    wallet: { create: { balance: 100 } },
                },
            });
            const poorToken = jwt.sign({ id: poorBuyer.id }, JWT_SECRET);

            const newListing = await prisma.listing.create({
                data: {
                    title: 'Expensive Item',
                    description: 'Pricey',
                    price: 1000,
                    category: 'Electronics',
                    condition: 'NEW',
                    sellerId: sellerId,
                },
            });

            const res = await request(app)
                .post(`/api/listings/${newListing.id}/purchase`)
                .set('Authorization', `Bearer ${poorToken}`)
                .send({ paymentMethod: 'WALLET' });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Insufficient balance');
        });
    });

    describe('PATCH /api/listings/:id/status', () => {
        it('should update listing status by seller', async () => {
            const listing = await prisma.listing.create({
                data: {
                    title: 'Status Test',
                    description: 'Test',
                    price: 500,
                    category: 'Misc',
                    condition: 'USED',
                    sellerId: sellerId,
                },
            });

            const res = await request(app)
                .patch(`/api/listings/${listing.id}/status`)
                .set('Authorization', `Bearer ${sellerToken}`)
                .send({ status: 'RESERVED' });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('updated to RESERVED');

            const updated = await prisma.listing.findUnique({ where: { id: listing.id } });
            expect(updated?.status).toBe('RESERVED');
        });

        it('should fail if update attempted by non-seller', async () => {
            const listing = await prisma.listing.create({
                data: {
                    title: 'Other User Item',
                    description: 'Test',
                    price: 500,
                    category: 'Misc',
                    condition: 'USED',
                    sellerId: sellerId,
                },
            });

            const res = await request(app)
                .patch(`/api/listings/${listing.id}/status`)
                .set('Authorization', `Bearer ${buyerToken}`)
                .send({ status: 'SOLD' });

            expect(res.status).toBe(403);
        });
    });

    describe('POST /api/listings/:id/reserve', () => {
        it('should reserve a listing', async () => {
            const listing = await prisma.listing.create({
                data: {
                    title: 'Reserve Test',
                    description: 'Test',
                    price: 500,
                    category: 'Misc',
                    condition: 'USED',
                    sellerId: sellerId,
                },
            });

            const res = await request(app)
                .post(`/api/listings/${listing.id}/reserve`)
                .set('Authorization', `Bearer ${buyerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('reserved successfully');

            const updated = await prisma.listing.findUnique({ where: { id: listing.id } });
            expect(updated?.status).toBe('RESERVED');
        });
    });
});
