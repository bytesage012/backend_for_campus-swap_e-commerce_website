import request from 'supertest';
import app from '../src/index.js';
import prisma from '../src/prisma.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('Admin User Management Endpoints', () => {
    let adminToken: string;
    let user1Id: string;
    let user2Id: string;

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

        // Create Admin
        const admin = await prisma.user.create({
            data: {
                email: 'admin@unn.edu.ng',
                password: 'password123',
                fullName: 'Super Admin',
                isAdmin: true,
                role: 'ADMIN',
            },
        });
        adminToken = jwt.sign({ id: admin.id, isAdmin: true, role: 'ADMIN' }, JWT_SECRET);

        // Create Users
        const user1 = await prisma.user.create({
            data: {
                email: 'user1@unn.edu.ng',
                password: 'password123',
                fullName: 'User One',
                faculty: 'Engineering',
                verificationStatus: 'APPROVED',
                trustScore: 80.0,
            },
        });
        user1Id = user1.id;

        const user2 = await prisma.user.create({
            data: {
                email: 'user2@unn.edu.ng',
                password: 'password123',
                fullName: 'User Two',
                faculty: 'Science',
                verificationStatus: 'PENDING',
                trustScore: 40.0,
                riskScore: 60.0,
            },
        });
        user2Id = user2.id;
    });

    describe('GET /api/admin/users', () => {
        it('should list all users with pagination', async () => {
            const res = await request(app)
                .get('/api/admin/users?page=1&limit=10')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(3); // admin + 2 users
            expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
        });

        it('should filter by faculty', async () => {
            const res = await request(app)
                .get('/api/admin/users?faculty=Engineering')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data[0].email).toBe('user1@unn.edu.ng');
            expect(res.body.data.length).toBe(1);
        });

        it('should filter by risk score', async () => {
            const res = await request(app)
                .get('/api/admin/users?maxRiskScore=10') // Should get admin and user1 (default 0)
                .set('Authorization', `Bearer ${adminToken}`);

            // user2 has risk 60, so shouldn't show if maxRisk is 10? 
            // query is lte: maxRiskScore. user1 has 0. user2 has 60.
            // Wait, my logic: if (maxRiskScore) where.riskScore = { lte: ... }

            // user1(0) <= 10. Admin(0) <= 10.
            expect(res.status).toBe(200);
            const emails = res.body.data.map((u: any) => u.email);
            expect(emails).toContain('user1@unn.edu.ng');
            expect(emails).not.toContain('user2@unn.edu.ng');
        });
    });

    describe('POST /api/admin/users/bulk-action', () => {
        it('should update status for multiple users', async () => {
            const res = await request(app)
                .post('/api/admin/users/bulk-action')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    userIds: [user1Id, user2Id],
                    action: 'UPDATE_STATUS',
                    data: { status: 'REJECTED' }
                });

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(2);

            // Verify
            const updated = await prisma.user.findMany({
                where: { id: { in: [user1Id, user2Id] } }
            });
            expect(updated[0]?.verificationStatus).toBe('REJECTED');
            expect(updated[1]?.verificationStatus).toBe('REJECTED');
        });
    });

    describe('GET /api/admin/users/export', () => {
        it('should export users as CSV', async () => {
            const res = await request(app)
                .get('/api/admin/users/export')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.header['content-type']).toContain('text/csv');
            expect(res.text).toContain('User One');
            expect(res.text).toContain('email');
        });
    });
});
