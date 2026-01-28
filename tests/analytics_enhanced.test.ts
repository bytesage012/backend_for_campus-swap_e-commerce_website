import request from 'supertest';
import app from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('Enhanced Seller Analytics', () => {
    let sellerToken: string;
    let sellerId: string;
    let buyerId: string;

    beforeAll(async () => {
        // Cleanup with correct dependency order
        await (prisma as any).adminLog.deleteMany();
        await (prisma as any).userDevice.deleteMany();
        await (prisma as any).listingAnalytics.deleteMany();
        await (prisma as any).moderationLog.deleteMany();
        await (prisma as any).listingModeration.deleteMany();
        await (prisma as any).report.deleteMany();
        await (prisma as any).preference.deleteMany();
        await (prisma as any).notification.deleteMany();
        await (prisma as any).savedItem.deleteMany();
        await (prisma as any).message.deleteMany();
        await prisma.conversation.deleteMany();
        await prisma.review.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await (prisma as any).verification.deleteMany();
        await (prisma as any).withdrawal.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.listingImage.deleteMany();
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.user.deleteMany();

        // Create Seller
        const seller = await prisma.user.create({
            data: {
                email: 'seller_analytics@unn.edu.ng',
                password: 'password',
                fullName: 'Analytics Seller',
                wallet: { create: { balance: 0 } },
            },
            include: { wallet: true },
        });
        sellerId = seller.id;
        sellerToken = jwt.sign({ id: seller.id }, JWT_SECRET);

        // Create Buyer
        const buyer = await prisma.user.create({
            data: {
                email: 'buyer_analytics@unn.edu.ng',
                password: 'password',
                fullName: 'Analytics Buyer',
                faculty: 'Engineering',
                residenceArea: 'Hostel A',
                wallet: { create: { balance: 100000 } },
            },
        });
        buyerId = buyer.id;

        // Create Listings and Interaction Data
        // 1. Sold Item
        const soldItem = await prisma.listing.create({
            data: {
                sellerId: seller.id,
                title: 'Sold Laptop',
                description: 'A great laptop',
                price: 150000,
                category: 'Electronics',
                condition: 'USED',
                status: 'SOLD',
                analytics: {
                    create: { totalViews: 100 }
                }
            }
        });

        // 2. Mock Transaction for Sold Item
        await prisma.transaction.create({
            data: {
                walletId: seller.wallet!.id,
                amount: 150000,
                type: 'SALE',
                status: 'SUCCESS',
                listingId: soldItem.id,
                platformFee: 750, // 0.5% fee example
            }
        });

        // 3. Smart Contract for Customer Insights
        await (prisma as any).smartContract.create({
            data: {
                buyerId: buyer.id,
                sellerId: seller.id,
                listingId: soldItem.id,
                terms: {},
                state: {},
                status: 'COMPLETED'
            }
        });

        // 4. Review
        await prisma.review.create({
            data: {
                targetId: seller.id,
                reviewerId: buyer.id,
                rating: 5,
                comment: "Great seller!"
            }
        });

    });

    afterAll(async () => {
        // Shared connection maintained
    });

    it('should return enhanced analytics with all 5 pillars', async () => {
        const res = await request(app)
            .get(`/api/analytics/seller/${sellerId}`)
            .set('Authorization', `Bearer ${sellerToken}`);

        expect(res.status).toBe(200);

        // 1. Performance
        expect(res.body.performance).toBeDefined();
        expect(res.body.performance.overallRating).toBe(5);
        expect(res.body.performance.conversionRate).toBeGreaterThan(0); // 1 sold / 100 views = 1%

        // 2. Financials
        expect(res.body.financials).toBeDefined();
        expect(res.body.financials.totalRevenue).toBe(150000);
        expect(res.body.financials.netProfit).toBe(149250); // 150000 - 750
        expect(res.body.financials.mostProfitableCategory).toBe('Electronics');

        // 3. Inventory
        expect(res.body.inventory).toBeDefined();
        expect(res.body.inventory.soldListings).toBe(1);
        expect(res.body.inventory.turnoverRate).toBe(100); // 1 item total, 1 sold

        // 4. Customers
        expect(res.body.customers).toBeDefined();
        expect(res.body.customers.totalUniqueBuyers).toBe(1);
        expect(res.body.customers.topFaculties).toContain('Engineering');
        expect(res.body.customers.topLocations).toContain('Hostel A');

        // 5. Competition
        expect(res.body.competition).toBeDefined();
        expect(res.body.competition.marketShareInTopCategory).toBeGreaterThan(0);
    });
});
