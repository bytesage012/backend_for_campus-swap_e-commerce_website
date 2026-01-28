import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

describe('Identity Verification Endpoints', () => {
    let token: string;
    let userId: string;
    const JWT_SECRET = process.env.JWT_SECRET || 'secret';

    beforeAll(async () => {
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

        const user = await prisma.user.create({
            data: {
                email: 'verify@unn.edu.ng',
                password: 'password123',
                fullName: 'Verify User',
                faculty: 'Engineering',
            },
        });
        userId = user.id;
        token = jwt.sign({ id: user.id }, JWT_SECRET);
    });

    afterAll(async () => {
        // Shared connection maintained
    });

    describe('POST /api/verification/upload-id', () => {
        it('should upload verification documents', async () => {
            const res = await request(app)
                .post('/api/verification/upload-id')
                .set('Authorization', `Bearer ${token}`)
                .field('documentType', 'STUDENT_ID')
                .attach('documentFront', Buffer.from('fake-id-front'), 'id-front.png')
                .attach('documentBack', Buffer.from('fake-id-back'), 'id-back.png');

            expect(res.status).toBe(202);
            expect(res.body.status).toBe('PENDING');
            expect(res.body.verificationId).toBeDefined();
        });

        it('should fail if documentFront is missing', async () => {
            const res = await request(app)
                .post('/api/verification/upload-id')
                .set('Authorization', `Bearer ${token}`)
                .field('documentType', 'STUDENT_ID');

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/verification/status', () => {
        it('should return the current verification status', async () => {
            const res = await request(app)
                .get('/api/verification/status')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('verificationLevel');
        });
    });
});
