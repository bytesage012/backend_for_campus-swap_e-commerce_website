import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

describe('Saved Items & Search Endpoints', () => {
    let token: string;
    let userId: string;
    let listingId: string;
    const JWT_SECRET = process.env.JWT_SECRET || 'secret';

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
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await (prisma as any).preference.deleteMany();
        await prisma.user.deleteMany();

        const user = await prisma.user.create({
            data: {
                email: 'saved-items@unn.edu.ng',
                password: 'password123',
                fullName: 'Saved Items User',
            },
        });
        userId = user.id;
        token = jwt.sign({ id: user.id }, JWT_SECRET);

        const listing = await prisma.listing.create({
            data: {
                title: 'Textbook for Sale',
                description: 'Engineering math',
                price: 5000,
                category: 'Textbooks',
                condition: 'USED',
                sellerId: userId,
            },
        });
        listingId = listing.id;

        // Create another listing for search tests
        await prisma.listing.create({
            data: {
                title: 'Lab Coat',
                description: 'White lab coat',
                price: 2000,
                category: 'Clothing',
                condition: 'NEW',
                sellerId: userId,
            },
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await pool.end();
    });

    describe('POST /api/listings/:id/save', () => {
        it('should save a listing to watchlist', async () => {
            const res = await request(app)
                .post(`/api/listings/${listingId}/save`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Listing added to watchlist');
        });

        it('should return 404 for non-existent listing', async () => {
            const res = await request(app)
                .post('/api/listings/00000000-0000-0000-0000-000000000000/save')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/watchlist', () => {
        it('should get user\'s saved listings', async () => {
            const res = await request(app)
                .get('/api/watchlist')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.items)).toBe(true);
            expect(res.body.items.length).toBe(1);
            expect(res.body.items[0].listing.id).toBe(listingId);
        });
    });

    describe('DELETE /api/listings/:id/save', () => {
        it('should remove a listing from watchlist', async () => {
            const res = await request(app)
                .delete(`/api/listings/${listingId}/save`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Listing removed from watchlist');

            const check = await (prisma as any).savedItem.findFirst({
                where: { userId, listingId }
            });
            expect(check).toBeNull();
        });
    });

    describe('GET /api/listings/search', () => {
        it('should search listings by keyword', async () => {
            const res = await request(app)
                .get('/api/listings/search?q=Textbook');

            expect(res.status).toBe(200);
            expect(res.body.results.length).toBe(1);
            expect(res.body.results[0].title).toContain('Textbook');
        });

        it('should search listings by category', async () => {
            const res = await request(app)
                .get('/api/listings/search?category=Clothing');

            expect(res.status).toBe(200);
            expect(res.body.results.length).toBe(1);
            expect(res.body.results[0].title).toBe('Lab Coat');
        });

        it('should filter by price range', async () => {
            const res = await request(app)
                .get('/api/listings/search?minPrice=1000&maxPrice=3000');

            expect(res.status).toBe(200);
            expect(res.body.results.length).toBe(1);
            expect(Number(res.body.results[0].price)).toBe(2000);
        });
    });
});
