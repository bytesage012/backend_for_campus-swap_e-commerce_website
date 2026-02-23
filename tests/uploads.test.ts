import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

describe('Upload Endpoints Verification', () => {
    let token: string;
    let userId: string;
    const JWT_SECRET = process.env['JWT_SECRET'] || 'secret';

    beforeAll(async () => {
        // Clean up
        await (prisma as any).adminLog.deleteMany();
        await (prisma as any).userDevice.deleteMany();
        await (prisma as any).notification.deleteMany();
        await (prisma as any).savedItem.deleteMany();
        await (prisma.message as any).deleteMany();
        await (prisma.conversation as any).deleteMany();
        await (prisma as any).review.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await (prisma as any).withdrawal.deleteMany();
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
                email: 'upload-test@unn.edu.ng',
                password: 'password123',
                fullName: 'Upload Tester',
                faculty: 'Sciences',
            },
        });
        userId = user.id;
        token = jwt.sign({ id: user.id }, JWT_SECRET);

        // Ensure directories exist
        const dirs = ['./uploads/listings', './uploads/verifications'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    });

    afterAll(async () => {
        // Shared connection maintained
    });

    describe('Marketplace Image Upload', () => {
        it('should upload multiple images for a listing', async () => {
            const res = await request(app)
                .post('/api/listings')
                .set('Authorization', `Bearer ${token}`)
                .field('title', 'Textbook with Real Image')
                .field('description', 'Test upload')
                .field('price', '1000')
                .field('category', 'Textbooks')
                .field('condition', 'NEW')
                .attach('images', Buffer.from('fake-image-1'), 'image1.jpg')
                .attach('images', Buffer.from('fake-image-2'), 'image2.jpg');

            expect(res.status).toBe(201);
            expect(res.body.images).toHaveLength(2);

            // Verify file existence (using the actual path from response if available, or checking the dir)
            const files = fs.readdirSync('./uploads/listings');
            expect(files.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Identity Verification Upload', () => {
        it('should upload front and back documents', async () => {
            const res = await request(app)
                .post('/api/verification/upload-id')
                .set('Authorization', `Bearer ${token}`)
                .field('documentType', 'STUDENT_ID')
                .attach('documentFront', Buffer.from('front-doc'), 'front.png')
                .attach('documentBack', Buffer.from('back-doc'), 'back.png');

            expect(res.status).toBe(202);
            expect(res.body.status).toBe('PENDING');
        });
    });

    // "Temp" uploads - testing a generic upload if it exists, or just verifying common temp space
    describe('General Upload Constraints', () => {
        it('should reject non-image files if restricted', async () => {
            const res = await request(app)
                .post('/api/listings')
                .set('Authorization', `Bearer ${token}`)
                .field('title', 'Invalid File')
                .attach('images', Buffer.from('not-an-image'), 'test.txt');

            expect(res.status).toBe(500); // Multer throws error resulting in 500 if not handled
        });

        it('should fail without token', async () => {
            const res = await request(app)
                .post('/api/listings')
                .attach('images', Buffer.from('image'), 'test.jpg');

            expect(res.status).toBe(401);
        });
    });
});
