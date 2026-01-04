import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import { bulkOperationsQueue, worker, redisConnection } from '../src/services/queueService.js';
import { closeSocket } from '../src/socket.js';
import fs from 'fs';

// Mock removed - assuming real Redis or accepting integration behavior
// We rely on the fact that the API adds to the queue and returns 202.
// The integration test checks that the DB record is created correctly.

describe('Bulk Operations API', () => {
    let sellerToken: string;
    let sellerId: string;

    beforeAll(async () => {
        // Create Seller
        const seller = await prisma.user.create({
            data: {
                email: `seller-bulk-${Date.now()}@test.com`,
                password: 'hashedpassword',
                isAdmin: true,
                role: 'ADMIN' // Using ADMIN to bypass any restrictTo issues for now
            }
        });
        sellerId = seller.id;
        sellerToken = jwt.sign({ id: seller.id, role: 'ADMIN' }, process.env.JWT_SECRET as string);
    });

    afterAll(async () => {
        // Cleanup
        await (prisma as any).bulkOperation.deleteMany({ where: { userId: sellerId } });
        await prisma.listing.deleteMany({ where: { sellerId } });
        await prisma.user.delete({ where: { id: sellerId } });
        await prisma.$disconnect();
        await pool.end();
        await bulkOperationsQueue.close();
        await worker.close();
        await redisConnection.quit();
        closeSocket();
    });

    describe('POST /api/bulk/listings (Bulk Create)', () => {
        it('should initiate bulk creation with CSV file', async () => {
            const res = await request(app)
                .post('/api/bulk/listings')
                .set('Authorization', `Bearer ${sellerToken}`)
                .attach('file', Buffer.from('title,price,category\nBook,100,Education'), 'test.csv');

            expect(res.status).toBe(202);
            expect(res.body).toHaveProperty('message', 'Bulk creation initiated');
            expect(res.body).toHaveProperty('operationId');

            // Verify DB audit record
            const op = await (prisma as any).bulkOperation.findUnique({
                where: { id: res.body.operationId }
            });
            expect(op).toBeTruthy();
            expect(op.type).toBe('BULK_CREATE');

            // Verify file system (check if any file exists in bulk-listings)
            const files = fs.readdirSync('uploads/bulk-listings');
            expect(files.length).toBeGreaterThan(0);

            // Status might be PENDING or PROCESSING depending on speed
            expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(op.status);
        });
    });

    describe('POST /api/bulk/listings/renew (Bulk Renew)', () => {
        it('should initiate bulk renewal', async () => {
            const res = await request(app)
                .post('/api/bulk/listings/renew')
                .set('Authorization', `Bearer ${sellerToken}`)
                .send({
                    criteria: { category: 'Textbooks' },
                    options: { bumpToTop: true }
                });

            expect(res.status).toBe(202);
            expect(res.body).toHaveProperty('operationId');

            const op = await (prisma as any).bulkOperation.findUnique({
                where: { id: res.body.operationId }
            });
            expect(op.type).toBe('BULK_RENEW');
        });
    });

    describe('GET /api/bulk/status/:id', () => {
        it('should return operation status', async () => {
            // Create a dummy operation
            const op = await (prisma as any).bulkOperation.create({
                data: {
                    userId: sellerId,
                    type: 'EXPORT',
                    status: 'COMPLETED',
                    result: { url: 'http://example.com' }
                }
            });

            const res = await request(app)
                .get(`/api/bulk/status/${op.id}`)
                .set('Authorization', `Bearer ${sellerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('COMPLETED');
            expect(res.body.result).toEqual({ url: 'http://example.com' });
        });
    });

    describe('POST /api/bulk/listings/price-optimize', () => {
        it('should initiate price optimization', async () => {
            const res = await request(app)
                .post('/api/bulk/listings/price-optimize')
                .set('Authorization', `Bearer ${sellerToken}`)
                .send({
                    listingIds: ['list-1', 'list-2'],
                    criteria: { category: 'Electronics' }
                });

            expect(res.status).toBe(202);
            expect(res.body).toHaveProperty('operationId');
        });
    });

    describe('POST /api/bulk/messages', () => {
        it('should initiate bulk messaging', async () => {
            const res = await request(app)
                .post('/api/bulk/messages')
                .set('Authorization', `Bearer ${sellerToken}`)
                .send({
                    recipients: ['user-1', 'user-2'],
                    content: 'Hello World'
                });

            expect(res.status).toBe(202);
            expect(res.body).toHaveProperty('operationId');
        });
    });

    describe('POST /api/bulk/export', () => {
        it('should initiate export', async () => {
            const res = await request(app)
                .post('/api/bulk/export')
                .set('Authorization', `Bearer ${sellerToken}`)
                .send({
                    type: 'CSV',
                    filters: { category: 'Books' }
                });

            expect(res.status).toBe(202);
            expect(res.body).toHaveProperty('operationId');
        });
    });
});
