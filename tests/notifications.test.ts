import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import { closeSocket } from '../src/socket.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

describe('Notification Endpoints', () => {
    jest.setTimeout(30000);
    let token: string;
    let userId: string;
    let notificationId: string;
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
                email: 'notifications@unn.edu.ng',
                password: 'password123',
                fullName: 'Notification User',
            },
        });
        userId = user.id;
        token = jwt.sign({ id: user.id }, JWT_SECRET);

        // Create some notifications
        const notif = await (prisma as any).notification.create({
            data: {
                userId,
                type: 'SYSTEM',
                title: 'Welcome!',
                body: 'Welcome to Campus Swap!',
            },
        });
        notificationId = notif.id;

        await (prisma as any).notification.create({
            data: {
                userId,
                type: 'MESSAGE',
                title: 'New Message',
                body: 'You have a new message from a buyer.',
            },
        });
    }, 30000);

    afterAll(async () => {
        await prisma.$disconnect();
        await pool.end();
        closeSocket();
    }, 30000);

    describe('GET /api/notifications', () => {
        it('should get all notifications for a user', async () => {
            const res = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.notifications)).toBe(true);
            expect(res.body.notifications.length).toBe(2);
            expect(res.body.unreadCount).toBe(2);
        });

        it('should filter unread notifications only', async () => {
            const res = await request(app)
                .get('/api/notifications?unreadOnly=true')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.notifications.length).toBe(2);
        });
    });

    describe('POST /api/notifications/:id/read', () => {
        it('should mark a single notification as read', async () => {
            const res = await request(app)
                .post(`/api/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Notification marked as read');

            const check = await (prisma as any).notification.findUnique({ where: { id: notificationId } });
            expect(check.isRead).toBe(true);

            // Verify unread count decreased
            const listRes = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${token}`);
            expect(listRes.body.unreadCount).toBe(1);
        });
    });

    describe('POST /api/notifications/read-all', () => {
        it('should mark all notifications as read', async () => {
            const res = await request(app)
                .post('/api/notifications/read-all')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('All notifications marked as read');

            const listRes = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${token}`);
            expect(listRes.body.unreadCount).toBe(0);
            expect(listRes.body.notifications.every((n: any) => n.isRead === true)).toBe(true);
        });
    });
});
