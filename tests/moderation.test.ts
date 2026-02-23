import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js'; // Ensure correct import for singleton instance
import jwt from 'jsonwebtoken';

describe('Listing Moderation System', () => {
    let adminToken: string;
    let userToken: string;
    let adminId: string;
    let sellerId: string;
    let listingId: string;

    const JWT_SECRET = process.env['JWT_SECRET'] || 'secret';

    beforeAll(async () => {
        // Cleanup
        await (prisma as any).adminLog.deleteMany();
        await (prisma as any).userDevice.deleteMany();
        await (prisma as any).moderationLog.deleteMany();
        await (prisma as any).listingModeration.deleteMany();
        await (prisma as any).notification.deleteMany();
        await (prisma as any).savedItem.deleteMany();
        await (prisma as any).message.deleteMany();
        await (prisma as any).conversation.deleteMany();
        await (prisma as any).review.deleteMany();
        await (prisma as any).verification.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.listingImage.deleteMany();
        await (prisma as any).report.deleteMany();
        await (prisma as any).listingAnalytics.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await (prisma as any).withdrawal.deleteMany();
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await (prisma as any).preference.deleteMany();
        await prisma.user.deleteMany();

        // Create Admin
        const admin = await prisma.user.create({
            data: {
                email: 'admin_mod@test.com',
                password: 'hashedpassword',
                isAdmin: true,
                role: 'ADMIN',
                verificationStatus: 'APPROVED'
            }
        });
        adminId = admin.id;
        adminToken = jwt.sign({ id: admin.id, isAdmin: true }, JWT_SECRET);

        // Create Seller
        const seller = await prisma.user.create({
            data: {
                email: 'seller_mod@test.com',
                password: 'hashedpassword',
                trustScore: 80.0
            }
        });
        sellerId = seller.id;
        userToken = jwt.sign({ id: seller.id }, JWT_SECRET);

        // Create Listing
        const listing = await prisma.listing.create({
            data: {
                sellerId: seller.id,
                title: 'Suspicious Crypto Scheme',
                description: 'Send crypto get rich instantly',
                price: 1000,
                category: 'Other',
                condition: 'NEW',
                status: 'ACTIVE'
            }
        });
        listingId = listing.id;
    }, 30000);

    afterAll(async () => {
        // Shared connection maintained
    });

    it('should allow admin to fetch moderation queue', async () => {
        // First, trigger addition to queue manually for test
        // In real app, this happens on triggers. We'll rely on our service logic being called or manually insert.
        // Let's use the endpoint if we had one to "flag", but we only have review. 
        // We need to seed the queue first.

        // Let's manually insert into queue using Prisma to simulate a trigger
        await prisma.listingModeration.create({
            data: {
                listingId,
                priorityScore: 50,
                status: 'PENDING',
                flaggedBy: ['AI']
            }
        });

        const res = await request(app)
            .get('/api/admin/listings/queue')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].listing.title).toBe('Suspicious Crypto Scheme');
    });

    it('should reject non-admin access', async () => {
        const res = await request(app)
            .get('/api/admin/listings/queue')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
    });

    it('should allow admin to review a listing (APPROVE)', async () => {
        const res = await request(app)
            .post(`/api/admin/listings/${listingId}/review`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                action: 'APPROVE',
                reason: 'Looks okay actually'
            });

        expect(res.status).toBe(200);

        const updated = await prisma.listingModeration.findUnique({ where: { listingId } });
        expect(updated?.status).toBe('APPROVED');

        const listing = await prisma.listing.findUnique({ where: { id: listingId } });
        expect(listing?.status).toBe('ACTIVE');
    });

    it('should allow admin to review a listing (REJECT)', async () => {
        // Reset to pending
        await prisma.listingModeration.update({
            where: { listingId },
            data: { status: 'PENDING' }
        });

        const res = await request(app)
            .post(`/api/admin/listings/${listingId}/review`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                action: 'REJECT',
                reason: 'Scam confirmed',
                notes: 'Ban user later'
            });

        expect(res.status).toBe(200);

        const updated = await prisma.listingModeration.findUnique({ where: { listingId } });
        expect(updated?.status).toBe('REJECTED');

        // Listing should be archived
        // Wait, current logic sets it to ARCHIVED. Check enum in schema.
        // Step 2189 showed ListingStatusEnum: DRAFT, ACTIVE, RESERVED, SOLD, ARCHIVED.
        const listing = await prisma.listing.findUnique({ where: { id: listingId } });
        expect(listing?.status).toBe('ARCHIVED');
    });

    it('should fetch removed listings', async () => {
        const res = await request(app)
            .get('/api/admin/listings/removed')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].listingId).toBe(listingId);
    }, 30000);
});
