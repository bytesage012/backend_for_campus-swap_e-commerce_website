import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { EscrowStatus } from '@prisma/client';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('Smart Contracts & Seller Analytics', () => {
    let sellerToken: string;
    let buyerToken: string;
    let sellerId: string;
    let buyerId: string;
    let listingId: string;
    let contractId: string;

    beforeAll(async () => {
        // Cleanup 
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();

        await prisma.transaction.deleteMany();
        await prisma.withdrawal.deleteMany();
        await prisma.listingAnalytics.deleteMany();
        await prisma.listingImage.deleteMany();
        await prisma.savedItem.deleteMany();
        await prisma.message.deleteMany();
        await prisma.conversation.deleteMany();
        await prisma.review.deleteMany();
        await prisma.report.deleteMany();
        await prisma.moderationLog.deleteMany();
        await prisma.listingModeration.deleteMany();
        await prisma.listing.deleteMany();

        await prisma.verification.deleteMany();
        await prisma.notification.deleteMany();
        await prisma.userDevice.deleteMany();
        await prisma.adminLog.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.preference.deleteMany();
        await prisma.user.deleteMany();

        // Create Seller
        const seller = await prisma.user.create({
            data: {
                email: 'seller2@unn.edu.ng',
                password: 'password',
                fullName: 'Seller Two',
                wallet: { create: { balance: 0 } },
            },
        });
        sellerId = seller.id;
        sellerToken = jwt.sign({ id: seller.id }, JWT_SECRET);

        // Create Buyer
        const buyer = await prisma.user.create({
            data: {
                email: 'buyer2@unn.edu.ng',
                password: 'password',
                fullName: 'Buyer Two',
                wallet: { create: { balance: 100000 } },
            },
        });
        buyerId = buyer.id;
        buyerToken = jwt.sign({ id: buyer.id }, JWT_SECRET);

        // Create Listing
        const listing = await prisma.listing.create({
            data: {
                sellerId: seller.id,
                title: 'Smart Phone',
                description: 'A very smart phone',
                price: 50000,
                category: 'Electronics',
                condition: 'NEW',
            },
        });
        listingId = listing.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await pool.end();
    });

    describe('POST /api/escrow/smart-contract', () => {
        it('should create a new smart contract', async () => {
            const res = await request(app)
                .post('/api/escrow/smart-contract')
                .set('Authorization', `Bearer ${buyerToken}`)
                .send({
                    buyerId,
                    sellerId,
                    listingId,
                    terms: {
                        price: 50000,
                        escrowFee: 2.5,
                        releaseConditions: ["no_dispute_48h"],
                        disputeResolution: {
                            arbitrationFee: 1000,
                            timeout: "72h",
                            thirdPartyArbitration: true
                        }
                    }
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.status).toBe('CREATED');
            expect(res.body.state.buyer_signed).toBe(false);
            contractId = res.body.id;
        });
    });

    describe('POST /api/escrow/smart-contract/:id/sign', () => {
        it('should allow buyer to sign', async () => {
            const res = await request(app)
                .post(`/api/escrow/smart-contract/${contractId}/sign`)
                .set('Authorization', `Bearer ${buyerToken}`)
                .send({ signature: "mock_signature_buyer" });

            expect(res.status).toBe(200);
            expect(res.body.state.buyer_signed).toBe(true);
        });

        it('should allow seller to sign and update status to SIGNED', async () => {
            const res = await request(app)
                .post(`/api/escrow/smart-contract/${contractId}/sign`)
                .set('Authorization', `Bearer ${sellerToken}`)
                .send({ signature: "mock_signature_seller" });

            expect(res.status).toBe(200);
            expect(res.body.state.seller_signed).toBe(true);
            expect(res.body.status).toBe('SIGNED');
        });
    });

    describe('GET /api/analytics/seller/:userId', () => {
        it('should return seller scorecard', async () => {
            const res = await request(app)
                .get(`/api/analytics/seller/${sellerId}`)
                .set('Authorization', `Bearer ${buyerToken}`); // Publicly viewable by others? or just protected

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('scorecard');
            expect(res.body.scorecard.activeListings).toBe(1);
        });
    });
});
