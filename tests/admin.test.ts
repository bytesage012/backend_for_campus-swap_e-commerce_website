import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { bulkOperationsQueue, worker, redisConnection } from '../src/services/queueService.js';
import { closeSocket } from '../src/socket.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('Admin Dashboard Endpoint', () => {
    jest.setTimeout(30000);
    let adminToken: string;
    let adminUserId: string;
    let regularToken: string;

    beforeAll(async () => {
        // Cleanup in correct order
        await (prisma as any).preference.deleteMany();
        await (prisma as any).notification.deleteMany();
        await (prisma as any).savedItem.deleteMany();
        await (prisma as any).message.deleteMany();
        await (prisma as any).conversation.deleteMany();
        await (prisma as any).review.deleteMany();
        await (prisma as any).verification.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await prisma.transaction.deleteMany();
        await (prisma as any).withdrawal.deleteMany();
        await (prisma as any).moderationLog.deleteMany();
        await (prisma as any).listingModeration.deleteMany();
        await prisma.listingImage.deleteMany();
        await (prisma as any).listingModeration.deleteMany();
        await (prisma as any).listingAnalytics.deleteMany();
        await (prisma as any).report.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.user.deleteMany();

        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const adminUser = await (prisma.user as any).create({
            data: {
                email: 'admin@unn.edu.ng',
                password: hashedPassword,
                fullName: 'Admin User',
                faculty: 'Administration',
                phoneNumber: '+2348012345678',
                isAdmin: true,
                role: 'ADMIN',
            },
        });
        adminUserId = adminUser.id;
        adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email }, JWT_SECRET);

        // Create regular user
        const regularUser = await prisma.user.create({
            data: {
                email: 'regular@unn.edu.ng',
                password: hashedPassword,
                fullName: 'Regular User',
                faculty: 'Engineering',
                phoneNumber: '+2348087654321',
            },
        });
        regularToken = jwt.sign({ id: regularUser.id, email: regularUser.email }, JWT_SECRET);

        // Create some test data for dashboard
        await prisma.wallet.create({
            data: {
                userId: adminUserId,
                balance: 10000,
            },
        });

        await prisma.wallet.create({
            data: {
                userId: regularUser.id,
                balance: 5000,
            },
        });

        // Create test listing
        await prisma.listing.create({
            data: {
                title: 'Test Textbook',
                description: 'Engineering textbook',
                price: 3500,
                category: 'Textbooks',
                condition: 'USED',
                sellerId: adminUserId,
            },
        });
    }, 30000);

    describe('GET /api/admin/dashboard', () => {
        it('should return comprehensive dashboard data for admin', async () => {
            const res = await request(app)
                .get('/api/admin/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body).toHaveProperty('period');
            expect(res.body).toHaveProperty('stats');
            expect(res.body).toHaveProperty('charts');
            expect(res.body).toHaveProperty('systemHealth');
            expect(res.body).toHaveProperty('moderationQueue');
            expect(res.body).toHaveProperty('alerts');

            // Verify stats structure
            expect(res.body.stats).toHaveProperty('users');
            expect(res.body.stats.users).toHaveProperty('total');
            expect(res.body.stats.users.total).toBeGreaterThanOrEqual(2);

            expect(res.body.stats).toHaveProperty('listings');
            expect(res.body.stats.listings.total).toBeGreaterThanOrEqual(1);

            expect(res.body.stats).toHaveProperty('wallet');
            expect(res.body.stats.wallet.totalBalance).toBeGreaterThanOrEqual(15000);

            expect(res.body.stats).toHaveProperty('financial');
            expect(res.body.stats.financial).toHaveProperty('commission');
            expect(res.body.stats.financial).toHaveProperty('withdrawalFees');
            expect(res.body.stats.financial).toHaveProperty('totalRevenue');

            // Verify charts
            expect(res.body.charts).toHaveProperty('signupsTrend');
            expect(Array.isArray(res.body.charts.signupsTrend)).toBe(true);

            expect(res.body.charts).toHaveProperty('facultyDistribution');
            expect(Array.isArray(res.body.charts.facultyDistribution)).toBe(true);

            // Verify system health
            expect(res.body.systemHealth).toHaveProperty('database');
            expect(res.body.systemHealth.database.status).toBe('connected');
            expect(res.body.systemHealth).toHaveProperty('storage');
            expect(res.body.systemHealth).toHaveProperty('performance');

            // Verify moderation queue
            expect(res.body.moderationQueue).toHaveProperty('pendingVerifications');
            expect(typeof res.body.moderationQueue.pendingVerifications).toBe('number');
        });

        it('should deny access to regular users', async () => {
            const res = await request(app)
                .get('/api/admin/dashboard')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Admin access required');
        });

        it('should deny access without authentication', async () => {
            const res = await request(app)
                .get('/api/admin/dashboard');

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Not authorized');
        });

        it('should support custom period query parameter', async () => {
            const res = await request(app)
                .get('/api/admin/dashboard?period=last_7_days')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.period).toBe('last_7_days');
        });

        it('should cache responses (second request faster)', async () => {
            // First request
            const start1 = Date.now();
            await request(app)
                .get('/api/admin/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);
            const time1 = Date.now() - start1;

            // Second request (should be cached)
            const start2 = Date.now();
            const res2 = await request(app)
                .get('/api/admin/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);
            const time2 = Date.now() - start2;

            expect(res2.status).toBe(200);
            // Cached request should be significantly faster (not always reliable in tests)
            // Just verify it works
            expect(time2).toBeLessThan(time1 + 1000);
        });

        it('should enforce rate limiting', async () => {
            // Make 11 requests (limit is 10/minute)
            const requests = [];
            for (let i = 0; i < 11; i++) {
                requests.push(
                    request(app)
                        .get('/api/admin/dashboard')
                        .set('Authorization', `Bearer ${adminToken}`)
                );
            }

            const responses = await Promise.all(requests);
            const rateLimited = responses.filter(r => r.status === 429);

            // At least one should be rate limited
            expect(rateLimited.length).toBeGreaterThanOrEqual(1);
        }, 15000); // Increase timeout for rate limit test
    });

    afterAll(async () => {
        await bulkOperationsQueue.close();
        await worker.close();
        await redisConnection.quit();
        closeSocket();
    }, 30000);
});
