import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import { closeSocket } from '../src/socket.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { EscrowStatus } from '@prisma/client';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('Escrow Dashboard Endpoints', () => {
    jest.setTimeout(30000);
    let adminToken: string;
    let userToken: string;
    let adminId: string;
    let sellerId: string;
    let buyerId: string;

    beforeAll(async () => {
        // Cleanup - Order matters!!!
        await (prisma as any).adminLog.deleteMany();
        await (prisma as any).userDevice.deleteMany();
        await (prisma as any).notification.deleteMany();
        await (prisma as any).savedItem.deleteMany();
        await (prisma as any).message.deleteMany();
        await (prisma.conversation as any).deleteMany(); // Refs Listing
        await (prisma as any).review.deleteMany();
        await (prisma as any).verification.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await (prisma as any).withdrawal.deleteMany();
        await prisma.transaction.deleteMany(); // Refs Wallet, Listing

        await prisma.listingImage.deleteMany(); // Refs Listing (Missed this before!)
        await (prisma as any).report.deleteMany();
        await (prisma as any).listingAnalytics.deleteMany();
        await (prisma as any).moderationLog.deleteMany();
        await (prisma as any).listingModeration.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();


        // Line 38 is "await prisma.listing.deleteMany();"
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await (prisma as any).preference.deleteMany();
        await prisma.user.deleteMany();

        // Create Admin
        const admin = await prisma.user.create({
            data: {
                email: 'admin@unn.edu.ng',
                password: 'password',
                fullName: 'Admin User',
                isAdmin: true,
                role: 'ADMIN',
            },
        });
        adminId = admin.id;
        adminToken = jwt.sign({ id: admin.id }, JWT_SECRET);

        // Create Seller
        const seller = await prisma.user.create({
            data: {
                email: 'seller@unn.edu.ng',
                password: 'password',
                fullName: 'Seller User',
                wallet: { create: { balance: 0 } },
            },
        });
        sellerId = seller.id;

        // Create Buyer with Wallet
        const buyer = await prisma.user.create({
            data: {
                email: 'buyer@unn.edu.ng',
                password: 'password',
                fullName: 'Buyer User',
                wallet: { create: { balance: 100000 } },
            },
            include: { wallet: true }
        });
        buyerId = buyer.id;
        userToken = jwt.sign({ id: buyer.id }, JWT_SECRET);
        const buyerWalletId = buyer.wallet!.id;

        // Create Listing
        const listing = await prisma.listing.create({
            data: {
                sellerId: seller.id,
                title: 'Expensive Laptop',
                description: 'A very expensive laptop',
                price: 50000,
                category: 'Electronics',
                condition: 'NEW',
            },
        });

        // Create Transactions with Escrow Status

        // 1. Held Transaction (High Value, Upcoming Release)
        await prisma.transaction.create({
            data: {
                walletId: buyerWalletId,
                amount: 60000,
                type: 'PURCHASE',
                status: 'SUCCESS',
                escrowStatus: EscrowStatus.HELD,
                listingId: listing.id,
                escrowReleaseDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // In 12 hours
            } as any
        });

        // 2. Disputed Transaction
        await prisma.transaction.create({
            data: {
                walletId: buyerWalletId,
                amount: 10000,
                type: 'PURCHASE',
                status: 'FAILED', // Or FAILED as per dashboard logic
                escrowStatus: EscrowStatus.DISPUTED,
                listingId: listing.id,
            } as any
        });

        // 3. Released Transaction (Historical)
        await prisma.transaction.create({
            data: {
                walletId: buyerWalletId,
                amount: 5000,
                type: 'PURCHASE',
                status: 'SUCCESS',
                escrowStatus: EscrowStatus.RELEASED,
                listingId: listing.id,
                createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Updated duration ~24h
            } as any
        });
    }, 30000);

    afterAll(async () => {
        await prisma.$disconnect();
        await pool.end();
        closeSocket();
    }, 30000);

    describe('GET /api/escrow/dashboard', () => {
        it('should prohibit access to non-admins', async () => {
            const res = await request(app)
                .get('/api/escrow/dashboard')
                .set('Authorization', `Bearer ${userToken}`);

            // Should be 403 Forbidden
            expect(res.status).toBe(403);
        });

        it('should allow access to admins', async () => {
            const res = await request(app)
                .get('/api/escrow/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('overview');
            expect(res.body).toHaveProperty('riskMonitoring');
        });

        it('should return correct real-time overview metrics', async () => {
            const res = await request(app)
                .get('/api/escrow/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);

            const overview = res.body.overview;
            // Total Held: 60000
            expect(Number(overview.totalFundsHeld)).toBe(60000);
            // Active Escrow Count: 1 (HELD)
            expect(overview.activeEscrowCount).toBe(1);
            // Disputed Percentage: 10000 / (60000+10000+5000) = 10000/75000 = 13.33%
            expect(overview.disputedFundsPercentage).toBeCloseTo(13.33, 1);
        });

        it('should identify high-value risks', async () => {
            const res = await request(app)
                .get('/api/escrow/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);

            const risks = res.body.riskMonitoring;
            expect(risks.highValueEscrows.length).toBeGreaterThan(0);
            expect(Number(risks.highValueEscrows[0].amount)).toBe(60000);
        });
    });
});
