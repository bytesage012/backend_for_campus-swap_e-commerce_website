import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('Smart Contract Release', () => {
    let buyerToken: string;
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

        const seller = await prisma.user.create({
            data: { email: 's@u.edu.ng', password: 'p', fullName: 'S', wallet: { create: { balance: 0 } } }
        });
        const buyer = await prisma.user.create({
            data: { email: 'b@u.edu.ng', password: 'p', fullName: 'B', wallet: { create: { balance: 100 } } }
        });
        buyerToken = jwt.sign({ id: buyer.id }, JWT_SECRET);

        const listing = await prisma.listing.create({
            data: {
                sellerId: seller.id,
                title: 'Item',
                description: 'Desc',
                price: 50,
                category: 'Cat',
                condition: 'NEW'
            }
        });

        const contract = await (prisma as any).smartContract.create({
            data: {
                buyerId: buyer.id,
                sellerId: seller.id,
                listingId: listing.id,
                terms: {},
                state: { buyer_signed: true, seller_signed: true }, // Already signed
                status: 'SIGNED'
            }
        });
        contractId = contract.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await pool.end();
    });

    it('should allow buyer to release funds', async () => {
        const res = await request(app)
            .post(`/api/escrow/smart-contract/${contractId}/release`)
            .set('Authorization', `Bearer ${buyerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('COMPLETED');
    });
});
