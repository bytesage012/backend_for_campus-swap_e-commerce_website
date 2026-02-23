import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env['JWT_SECRET'] || 'secret';

describe('Analytics & Reporting Endpoints', () => {
    let token: string;
    let userId: string;
    let listingId: string;

    beforeAll(async () => {
        // Cleanup with type casting for safety
        await (prisma as any).adminLog.deleteMany();
        await (prisma as any).userDevice.deleteMany();
        await (prisma as any).listingAnalytics.deleteMany();
        await (prisma as any).moderationLog.deleteMany();
        await (prisma as any).listingModeration.deleteMany();
        await (prisma as any).report.deleteMany();
        await (prisma as any).preference.deleteMany();
        await (prisma as any).notification.deleteMany();
        await (prisma as any).savedItem.deleteMany();
        await (prisma as any).message.deleteMany();
        await (prisma as any).conversation.deleteMany();
        await (prisma as any).review.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await (prisma as any).verification.deleteMany();
        await prisma.transaction.deleteMany();
        await (prisma as any).withdrawal.deleteMany();
        await prisma.listingImage.deleteMany();
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.user.deleteMany();

        // Create user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const user = await prisma.user.create({
            data: {
                email: 'seller@unn.edu.ng',
                password: hashedPassword,
                fullName: 'Seller User',
                faculty: 'Science',
            },
        });
        userId = user.id;
        token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

        // Create listing
        const listing = await prisma.listing.create({
            data: {
                sellerId: userId,
                title: 'Analytics Test Item',
                description: 'Testing analytics',
                price: 5000,
                category: 'Electronics',
                condition: 'NEW',
            },
        });
        listingId = listing.id;

        // Create initial analytics
        await prisma.listingAnalytics.create({
            data: {
                listingId,
                totalViews: 10,
                searchViews: 5,
                directViews: 5,
            },
        });
    });

    afterAll(async () => {
        // Shared connection maintained
    });

    describe('GET /api/analytics/listings/:id', () => {
        it('should return analytics for own listing', async () => {
            const res = await request(app)
                .get(`/api/analytics/listings/${listingId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.totalViews).toBe(10);
            expect(res.body.listingId).toBe(listingId);
        });

        it('should return 404 for non-existent listing', async () => {
            const res = await request(app)
                .get(`/api/analytics/listings/00000000-0000-0000-0000-000000000000`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/analytics/seller', () => {
        it('should return seller dashboard analytics', async () => {
            const res = await request(app)
                .get('/api/analytics/seller')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('overview');
            expect(res.body.overview.totalListings).toBe(1);
            expect(res.body.overview.totalViews).toBe(10);
            expect(res.body).toHaveProperty('viewSources');
            expect(res.body.viewSources.search).toBe(5);
        });
    });

    describe('POST /api/reports/listing/:id', () => {
        it('should create a report for a listing', async () => {
            const res = await request(app)
                .post(`/api/reports/listing/${listingId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    reason: 'SCAM',
                    description: 'This listing looks suspicious and asks for outside payment.',
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Report submitted successfully');
            expect(res.body).toHaveProperty('reportId');
        });

        it('should validate report input', async () => {
            const res = await request(app)
                .post(`/api/reports/listing/${listingId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    reason: 'INVALID_REASON',
                    description: 'Short',
                });

            expect(res.status).toBe(400);
        });
    });
});
