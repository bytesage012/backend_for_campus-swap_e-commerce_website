import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

describe('Auth Endpoints', () => {
    const testUser = {
        email: 'test@unn.edu.ng',
        password: 'Password123!',
        fullName: 'Test User',
        phoneNumber: '08012345678',
        faculty: 'Engineering',
    };

    beforeAll(async () => {
        // Create mock avatar if it doesn't exist
        if (!fs.existsSync('tests/mock-avatar.png')) {
            fs.writeFileSync('tests/mock-avatar.png', 'mock content');
        }

        // Clean up any existing data for the test user and related entities
        await (prisma as any).adminLog.deleteMany();
        await (prisma as any).userDevice.deleteMany();
        await (prisma as any).notification.deleteMany();
        await (prisma as any).savedItem.deleteMany();
        await (prisma.message as any).deleteMany();
        await (prisma.conversation as any).deleteMany();
        await (prisma as any).review.deleteMany();
        await (prisma as any).verification.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await (prisma as any).withdrawal.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.listingImage.deleteMany();
        await (prisma as any).report.deleteMany();
        await (prisma as any).listingAnalytics.deleteMany();
        await (prisma as any).moderationLog.deleteMany();
        await (prisma as any).listingModeration.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await (prisma as any).preference.deleteMany();
        await prisma.user.deleteMany();
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await pool.end();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            if (res.status !== 201) console.error('Register failed:', res.body);
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.email).toBe(testUser.email);
        });

        it('should fail with invalid email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...testUser, email: 'invalid-email' });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Invalid email');
        });

        it('should fail if user already exists', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('User already exists');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        it('should fail with incorrect password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword',
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid credentials');
        });
    });

    describe('Profile Endpoints', () => {
        let token: string;

        beforeAll(async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });
            token = res.body.token;
        });

        it('should get user profile', async () => {
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.email).toBe(testUser.email);
            expect(res.body).toHaveProperty('wallet');
        });

        it('should update user profile', async () => {
            const res = await request(app)
                .patch('/api/auth/profile')
                .set('Authorization', `Bearer ${token}`)
                .send({ fullName: 'Updated Name' });

            expect(res.status).toBe(200);
            expect(res.body.user.fullName).toBe('Updated Name');
        });

        it('should upload profile picture', async () => {
            const res = await request(app)
                .patch('/api/auth/profile')
                .set('Authorization', `Bearer ${token}`)
                .attach('avatar', 'tests/mock-avatar.png');

            expect(res.status).toBe(200);
            expect(res.body.user).toHaveProperty('avatarUrl');
            expect(res.body.user.avatarUrl).toContain('avatar-');
        });


        it('should fail to get profile without token', async () => {
            const res = await request(app).get('/api/auth/profile');
            expect(res.status).toBe(401);
        });
    });
});
