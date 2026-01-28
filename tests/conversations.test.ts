import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

describe('Conversations & Messaging Endpoints', () => {
    let buyerToken: string;
    let sellerToken: string;
    let sellerId: string;
    let buyerId: string;
    let listingId: string;
    let conversationId: string;
    const JWT_SECRET = process.env.JWT_SECRET || 'secret';

    beforeAll(async () => {
        // Clean up everything in the right order
        await (prisma as any).adminLog.deleteMany();
        await (prisma as any).userDevice.deleteMany();
        await (prisma.message as any).deleteMany();
        await (prisma.conversation as any).deleteMany();
        await (prisma as any).review.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await (prisma as any).withdrawal.deleteMany();
        await (prisma as any).verification.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.listingImage.deleteMany();
        await (prisma as any).report.deleteMany();
        await (prisma as any).listingAnalytics.deleteMany();
        await (prisma as any).moderationLog.deleteMany();
        await (prisma as any).listingModeration.deleteMany();
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await (prisma as any).notification.deleteMany();
        await (prisma as any).preference.deleteMany();
        await prisma.user.deleteMany();

        const seller = await prisma.user.create({
            data: {
                email: 'seller-chat@unn.edu.ng',
                password: 'password123',
                fullName: 'Seller Chat',
            },
        });
        sellerId = seller.id;
        sellerToken = jwt.sign({ id: seller.id }, JWT_SECRET);

        const buyer = await prisma.user.create({
            data: {
                email: 'buyer-chat@unn.edu.ng',
                password: 'password123',
                fullName: 'Buyer Chat',
            },
        });
        buyerId = buyer.id;
        buyerToken = jwt.sign({ id: buyer.id }, JWT_SECRET);

        const listing = await prisma.listing.create({
            data: {
                title: 'Chat Listing',
                description: 'Chat Description',
                price: 1000,
                category: 'Misc',
                condition: 'NEW',
                sellerId: sellerId,
            },
        });
        listingId = listing.id;
    });

    afterAll(async () => {
        // Shared connection maintained
    });

    describe('POST /api/conversations', () => {
        it('should start a new conversation for a listing', async () => {
            const res = await request(app)
                .post('/api/conversations')
                .set('Authorization', `Bearer ${buyerToken}`)
                .send({ listingId });

            expect(res.status).toBe(201);
            expect(res.body.conversationId).toBeDefined();
            conversationId = res.body.conversationId;
        });

        it('should return 400 if listing missing', async () => {
            const res = await request(app)
                .post('/api/conversations')
                .set('Authorization', `Bearer ${buyerToken}`)
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/conversations', () => {
        it('should list conversations for the current user', async () => {
            const res = await request(app)
                .get('/api/conversations')
                .set('Authorization', `Bearer ${buyerToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.conversations)).toBe(true);
            expect(res.body.conversations.length).toBeGreaterThan(0);
        });
    });

    describe('POST /api/conversations/:id/messages', () => {
        it('should send a message in a conversation', async () => {
            const res = await request(app)
                .post(`/api/conversations/${conversationId}/messages`)
                .set('Authorization', `Bearer ${buyerToken}`)
                .send({ content: 'Is this still available?' });

            expect(res.status).toBe(201);
            expect(res.body.messageId).toBeDefined();
        });
    });

    describe('GET /api/conversations/:id/messages', () => {
        it('should get message history for a conversation', async () => {
            const res = await request(app)
                .get(`/api/conversations/${conversationId}/messages`)
                .set('Authorization', `Bearer ${buyerToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.messages)).toBe(true);
            expect(res.body.messages.length).toBeGreaterThan(0);
            expect(res.body.messages[0].content).toBe('Is this still available?');
        });
    });
});
