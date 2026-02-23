import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';

describe('Platform Growth Analytics', () => {
    let adminToken: string;
    let userToken: string;
    let adminId: string;
    let userId: string;

    beforeAll(async () => {
        // Cleanup
        await (prisma as any).marketOffer.deleteMany();
        await (prisma as any).analyticsEvent.deleteMany();
        await (prisma as any).nPSSurvey.deleteMany();

        // Admin
        const admin = await prisma.user.create({
            data: {
                email: `admin.${Date.now()}@unn.edu.ng`,
                password: 'password123',
                role: 'ADMIN',
                isAdmin: true
            }
        });
        adminId = admin.id;
        adminToken = jwt.sign({ id: admin.id, role: 'ADMIN', isAdmin: true }, process.env['JWT_SECRET'] as string);

        // User
        const user = await prisma.user.create({
            data: {
                email: `user.${Date.now()}@unn.edu.ng`,
                password: 'password123',
                role: 'USER'
            }
        });
        userId = user.id;
        userToken = jwt.sign({ id: user.id }, process.env['JWT_SECRET'] as string);
    });

    afterAll(async () => {
        // Shared connection maintained
    });

    describe('GET /api/analytics/platform/growth', () => {
        it('should forbid non-admin access', async () => {
            const res = await request(app)
                .get('/api/analytics/platform/growth')
                .set('Authorization', `Bearer ${userToken}`);

            // Assuming restrictTo middleware returns 403.
            expect(res.status).toBe(403);
        });

        it('should return metrics for admin', async () => {
            const res = await request(app)
                .get('/api/analytics/platform/growth')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('funnel');
            expect(res.body).toHaveProperty('network');
            expect(res.body).toHaveProperty('liquidity');
            expect(res.body).toHaveProperty('pmf');
            expect(res.body.funnel.signups).toBeGreaterThanOrEqual(1); // At least our test users
        });
    });

    describe('POST /api/analytics/platform/events', () => {
        it('should record a generic event', async () => {
            const res = await request(app)
                .post('/api/analytics/platform/events')
                .send({
                    eventType: 'VISIT_HOMEPAGE',
                    sessionId: 'session-123',
                    metadata: { source: 'google' }
                });

            expect(res.status).toBe(201);

            // Verify in DB
            const events = await (prisma as any).analyticsEvent.findMany();
            expect(events.length).toBeGreaterThan(0);
        });

        it('should record an authenticated event', async () => {
            const res = await request(app)
                .post('/api/analytics/platform/events')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    eventType: 'VIEW_ITEM',
                    sessionId: 'session-123',
                    metadata: { itemId: '123' }
                });

            expect(res.status).toBe(201);

            const event = await (prisma as any).analyticsEvent.findFirst({
                where: { eventType: 'VIEW_ITEM' }
            });
            expect(event.userId).toBe(userId);
        });
    });
});
