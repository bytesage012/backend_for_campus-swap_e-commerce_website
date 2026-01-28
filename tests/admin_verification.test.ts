import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

describe('Admin Verification Management', () => {
    let adminToken: string;
    let userToken: string;
    let adminId: string;
    let userId: string;
    let verificationId: string;
    const JWT_SECRET = process.env.JWT_SECRET || 'secret';

    beforeAll(async () => {
        // Clean up
        await (prisma as any).adminLog.deleteMany();
        await (prisma as any).verification.deleteMany();
        await (prisma as any).preference.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.listing.deleteMany();
        await (prisma as any).notification.deleteMany();
        await prisma.user.deleteMany();

        // Create admin user
        const admin = await prisma.user.create({
            data: {
                email: 'admin@test.unn.edu.ng',
                password: 'admin123',
                fullName: 'Admin User',
                faculty: 'Engineering',
                role: 'ADMIN',
            },
        });
        adminId = admin.id;
        adminToken = jwt.sign({ id: admin.id }, JWT_SECRET);

        // Create regular user
        const user = await prisma.user.create({
            data: {
                email: 'user@test.unn.edu.ng',
                password: 'password123',
                fullName: 'Regular User',
                faculty: 'Engineering',
                verificationStatus: 'PENDING',
            },
        });
        userId = user.id;
        userToken = jwt.sign({ id: user.id }, JWT_SECRET);

        // Create a pending verification
        const verification = await (prisma as any).verification.create({
            data: {
                userId: user.id,
                documentType: 'STUDENT_ID',
                documentFrontUrl: '/uploads/verifications/front.jpg',
                documentBackUrl: '/uploads/verifications/back.jpg',
                status: 'PENDING',
            },
        });
        verificationId = verification.id;
    });

    afterAll(async () => {
        // Shared connection maintained
    });

    describe('GET /api/admin/verifications/pending', () => {
        it('should get pending verifications for admin', async () => {
            const res = await request(app)
                .get('/api/admin/verifications/pending')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.verifications).toBeDefined();
            expect(Array.isArray(res.body.verifications)).toBe(true);
            expect(res.body.total).toBeGreaterThan(0);
            expect(res.body.verifications[0]).toHaveProperty('user');
        });

        it('should fail for non-admin users', async () => {
            const res = await request(app)
                .get('/api/admin/verifications/pending')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .get('/api/admin/verifications/pending');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/admin/verifications', () => {
        it('should get all verifications with pagination', async () => {
            const res = await request(app)
                .get('/api/admin/verifications?page=1&limit=10')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.verifications).toBeDefined();
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination).toHaveProperty('total');
            expect(res.body.pagination).toHaveProperty('page');
            expect(res.body.pagination).toHaveProperty('limit');
        });

        it('should filter verifications by status', async () => {
            const res = await request(app)
                .get('/api/admin/verifications?status=PENDING')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.verifications.every((v: any) => v.status === 'PENDING')).toBe(true);
        });

        it('should filter verifications by userId', async () => {
            const res = await request(app)
                .get(`/api/admin/verifications?userId=${userId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.verifications.every((v: any) => v.userId === userId)).toBe(true);
        });
    });

    describe('POST /api/admin/verifications/:id/approve', () => {
        it('should approve a pending verification', async () => {
            const res = await request(app)
                .post(`/api/admin/verifications/${verificationId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Verification approved successfully');
            expect(res.body.verification.status).toBe('APPROVED');
            expect(res.body.user.isVerified).toBe(true);
            expect(res.body.user.verificationLevel).toBe('VERIFIED');

            // Verify the user record was updated
            const updatedUser = await prisma.user.findUnique({
                where: { id: userId },
            });
            expect(updatedUser?.isVerified).toBe(true);
            expect((updatedUser as any)?.verificationStatus).toBe('APPROVED');
            expect((updatedUser as any)?.verificationLevel).toBe('VERIFIED');
        });

        it('should fail to approve already approved verification', async () => {
            const res = await request(app)
                .post(`/api/admin/verifications/${verificationId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Cannot approve verification');
        });

        it('should fail for non-existent verification', async () => {
            const res = await request(app)
                .post('/api/admin/verifications/00000000-0000-0000-0000-000000000000/approve')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
        });

        it('should fail for non-admin users', async () => {
            const res = await request(app)
                .post(`/api/admin/verifications/${verificationId}/approve`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('POST /api/admin/verifications/:id/reject', () => {
        let pendingVerificationId: string;

        beforeEach(async () => {
            // Create a new pending verification for rejection tests
            const verification = await (prisma as any).verification.create({
                data: {
                    userId: userId,
                    documentType: 'STUDENT_ID',
                    documentFrontUrl: '/uploads/verifications/front2.jpg',
                    documentBackUrl: '/uploads/verifications/back2.jpg',
                    status: 'PENDING',
                },
            });
            pendingVerificationId = verification.id;
        });

        it('should reject a pending verification with reason', async () => {
            const rejectionReason = 'Documents are blurry and unreadable. Please upload clearer images.';

            const res = await request(app)
                .post(`/api/admin/verifications/${pendingVerificationId}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: rejectionReason });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Verification rejected');
            expect(res.body.verification.status).toBe('REJECTED');
            expect(res.body.rejectionReason).toBe(rejectionReason);

            // Verify the user record was updated
            const updatedUser = await prisma.user.findUnique({
                where: { id: userId },
            });
            expect((updatedUser as any)?.verificationStatus).toBe('REJECTED');
        });

        it('should fail without rejection reason', async () => {
            const res = await request(app)
                .post(`/api/admin/verifications/${pendingVerificationId}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Rejection reason is required');
        });

        it('should fail with short rejection reason', async () => {
            const res = await request(app)
                .post(`/api/admin/verifications/${pendingVerificationId}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'bad' });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('minimum 10 characters');
        });

        it('should fail for non-admin users', async () => {
            const res = await request(app)
                .post(`/api/admin/verifications/${pendingVerificationId}/reject`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ reason: 'This should not work for regular users' });

            expect(res.status).toBe(403);
        });
    });
});
