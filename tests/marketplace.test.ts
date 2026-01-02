import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

describe('Marketplace Endpoints', () => {
    let token: string;
    let userId: string;
    const JWT_SECRET = process.env.JWT_SECRET || 'secret';

    const testUser = {
        email: 'marketplace-test@unn.edu.ng',
        password: 'password123',
        fullName: 'Market User',
        faculty: 'Sciences',
    };

    beforeAll(async () => {
        // Clear database before tests
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
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await (prisma as any).preference.deleteMany();
        await prisma.user.deleteMany();

        const user = await prisma.user.create({
            data: {
                ...testUser,
                wallet: { create: { balance: 0 } },
            },
        });
        userId = user.id;
        token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await pool.end();
    });

    describe('POST /api/listings', () => {
        it('should create a listing with images', async () => {
            const res = await request(app)
                .post('/api/listings')
                .set('Authorization', `Bearer ${token}`)
                .field('title', 'Test Textbook')
                .field('description', 'A very good textbook for testing')
                .field('price', '1500.50')
                .field('category', 'Books')
                .field('condition', 'USED')
                .field('faculty', 'Sciences')
                .attach('images', Buffer.from('fake-image-data'), 'test-image.png');

            expect(res.status).toBe(201);
            expect(res.body.title).toBe('Test Textbook');
            expect(res.body.images).toHaveLength(1);
        });

        it('should fail with invalid data', async () => {
            const res = await request(app)
                .post('/api/listings')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'no' });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/listings', () => {
        it('should return all active listings', async () => {
            const res = await request(app).get('/api/listings');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should filter by faculty', async () => {
            const res = await request(app).get('/api/listings?faculty=Sciences');
            expect(res.status).toBe(200);
            res.body.forEach((listing: any) => {
                expect(listing.faculty).toBe('Sciences');
            });
        });
    });

    describe('GET /api/listings/:id', () => {
        it('should return a listing by ID', async () => {
            const all = await request(app).get('/api/listings');
            const id = all.body[0].id;

            const res = await request(app).get(`/api/listings/${id}`);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(id);
        });

        it('should return 404 for non-existent listing', async () => {
            const res = await request(app).get('/api/listings/non-existent-id');
            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /api/listings/:id', () => {
        it('should update a listing', async () => {
            const all = await request(app).get('/api/listings');
            const id = all.body[0].id;

            const res = await request(app)
                .patch(`/api/listings/${id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Updated Title' });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Updated Title');
        });

        it('should fail if not the owner', async () => {
            const otherToken = jwt.sign({ id: 'other-id' }, JWT_SECRET);
            const all = await request(app).get('/api/listings');
            const id = all.body[0].id;

            const res = await request(app)
                .patch(`/api/listings/${id}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send({ title: 'Hack' });

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/listings/:id', () => {
        it('should delete a listing', async () => {
            const all = await request(app).get('/api/listings');
            const id = all.body[0].id;

            const res = await request(app)
                .delete(`/api/listings/${id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);

            const find = await request(app).get(`/api/listings/${id}`);
            expect(find.status).toBe(404);
        });
    });
});
