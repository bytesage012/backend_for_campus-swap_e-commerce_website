import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

describe('Theme & Preference Endpoints', () => {
    let token: string;
    let userId: string;
    const JWT_SECRET = process.env['JWT_SECRET'] || 'secret';

    beforeAll(async () => {
        // Clean up
        await (prisma as any).adminLog.deleteMany();
        await (prisma as any).userDevice.deleteMany();
        await (prisma as any).preference.deleteMany();
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
        await prisma.user.deleteMany();

        const user = await prisma.user.create({
            data: {
                email: 'preference-test@unn.edu.ng',
                password: 'password123',
                fullName: 'Preference Tester',
                faculty: 'Engineering',
            },
        });
        userId = user.id;
        token = jwt.sign({ id: user.id }, JWT_SECRET);
    });

    afterAll(async () => {
        // Shared connection maintained
    });

    describe('GET /api/preferences/theme', () => {
        it('should get default theme preferences', async () => {
            const res = await request(app)
                .get('/api/preferences/theme')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.mode).toBe('AUTO');
            expect(res.body.facultyThemeEnabled).toBe(true);
            expect(res.body).toHaveProperty('lastUpdated');
        });
    });

    describe('PATCH /api/preferences/theme', () => {
        it('should update theme mode to DARK', async () => {
            const res = await request(app)
                .patch('/api/preferences/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    themeMode: 'DARK',
                    facultyThemeEnabled: false,
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Theme preferences updated');

            // Verify the update
            const getRes = await request(app)
                .get('/api/preferences/theme')
                .set('Authorization', `Bearer ${token}`);

            expect(getRes.body.mode).toBe('DARK');
            expect(getRes.body.facultyThemeEnabled).toBe(false);
        });

        it('should update custom colors', async () => {
            const res = await request(app)
                .patch('/api/preferences/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    accentColor: '#FF5733',
                    primaryColor: '#2E5A88',
                });

            expect(res.status).toBe(200);

            const getRes = await request(app)
                .get('/api/preferences/theme')
                .set('Authorization', `Bearer ${token}`);

            expect(getRes.body.accentColor).toBe('#FF5733');
            expect(getRes.body.primaryColor).toBe('#2E5A88');
        });

        it('should fail with invalid color format', async () => {
            const res = await request(app)
                .patch('/api/preferences/theme')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    accentColor: 'invalid-color',
                });

            expect(res.status).toBe(400);
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .patch('/api/preferences/theme')
                .send({ themeMode: 'LIGHT' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/preferences/faculties/colors', () => {
        it('should get all faculty color palettes', async () => {
            const res = await request(app)
                .get('/api/preferences/faculties/colors')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);

            const engineering = res.body.find((f: any) => f.faculty === 'Engineering');
            expect(engineering).toBeDefined();
            expect(engineering.primary).toBeDefined();
            expect(engineering.secondary).toBeDefined();
            expect(engineering.accent).toBeDefined();
            expect(engineering.darkBackground).toBeDefined();
        });
    });
});
