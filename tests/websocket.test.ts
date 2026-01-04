import { io as Client, Socket } from 'socket.io-client';
import request from 'supertest';
import { app, httpServer } from '../src/index.js';
import prisma, { pool } from '../src/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('WebSocket Integration Tests', () => {
    let buyerToken: string;
    let sellerToken: string;
    let adminToken: string;
    let buyerId: string;
    let sellerId: string;
    let adminId: string;
    let listingId: string;
    let port: number;

    beforeAll(async () => {
        // Start server on a random port for testing
        await new Promise<void>((resolve) => {
            httpServer.listen(0, () => {
                const address = httpServer.address();
                port = (address as any).port;
                resolve();
            });
        });

        // Cleanup
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
        await (prisma as any).conversation.deleteMany();
        await (prisma as any).review.deleteMany();
        await (prisma as any).contractAudit.deleteMany();
        await (prisma as any).contractEvidence.deleteMany();
        await (prisma as any).smartContract.deleteMany();
        await (prisma as any).verification.deleteMany();
        await prisma.transaction.deleteMany();
        await (prisma as any).withdrawal.deleteMany();
        await prisma.listingImage.deleteMany();
        await prisma.listing.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.user.deleteMany();

        const hashedPassword = await bcrypt.hash('password123', 10);

        // Create Seller
        const seller = await prisma.user.create({
            data: { email: 'seller@unn.edu.ng', password: hashedPassword, fullName: 'Seller User', role: 'USER' },
        });
        sellerId = seller.id;
        sellerToken = jwt.sign({ id: seller.id, email: seller.email, role: seller.role }, JWT_SECRET);

        // Create Buyer
        const buyer = await prisma.user.create({
            data: { email: 'buyer@unn.edu.ng', password: hashedPassword, fullName: 'Buyer User', role: 'USER' },
        });
        buyerId = buyer.id;
        buyerToken = jwt.sign({ id: buyer.id, email: buyer.email, role: buyer.role }, JWT_SECRET);

        // Create Admin
        const admin = await prisma.user.create({
            data: { email: 'admin@campusswap.com', password: hashedPassword, fullName: 'Admin User', role: 'ADMIN' },
        });
        adminId = admin.id;
        adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, JWT_SECRET);

        // Create Wallets
        await prisma.wallet.createMany({
            data: [
                { userId: sellerId, balance: 0 },
                { userId: buyerId, balance: 10000 },
            ],
        });
    });

    beforeEach(async () => {
        // Create a new listing for each test to avoid 'SOLD' status interference
        const listing = await prisma.listing.create({
            data: {
                sellerId,
                title: 'WebSocket Test Item',
                description: 'Test Description',
                price: 1000,
                category: 'Books',
                condition: 'NEW',
            },
        });
        listingId = listing.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await pool.end();
        httpServer.close();
    });

    const waitForEvent = (socket: Socket, event: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                socket.off(event);
                reject(new Error(`Timeout waiting for event: ${event}`));
            }, 10000);
            socket.once(event, (data) => {
                clearTimeout(timeout);
                resolve(data);
            });
        });
    };

    const createSocket = (token: string): Socket => {
        return Client(`http://localhost:${port}`, {
            auth: { token },
            transports: ['websocket'],
        });
    };

    it('should connect and join user room automatically', async () => {
        const socket = createSocket(buyerToken);
        await new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', (err) => reject(err));
        });
        socket.disconnect();
    });

    it('should fail connection with invalid token', async () => {
        const socket = createSocket('invalid-token');
        await new Promise<void>((resolve) => {
            socket.on('connect_error', (err) => {
                expect(err.message).toBe('Authentication error');
                resolve();
            });
        });
        socket.disconnect();
    });

    it('should receive real-time message notification', async () => {
        const sellerSocket = createSocket(sellerToken);
        const buyerSocket = createSocket(buyerToken);

        await new Promise<void>((resolve) => sellerSocket.on('connect', () => resolve()));

        // 1. Buyer starts conversation
        const convRes = await request(httpServer)
            .post('/api/conversations')
            .set('Authorization', `Bearer ${buyerToken}`)
            .send({ listingId });

        const conversationId = convRes.body.conversationId;

        // 2. Seller joins conversation room via socket
        sellerSocket.emit('join_conversation', conversationId);

        // 3. Prepare listener
        const messagePromise = waitForEvent(sellerSocket, 'new_message');

        // 4. Buyer sends message via REST
        await request(httpServer)
            .post(`/api/conversations/${conversationId}/messages`)
            .set('Authorization', `Bearer ${buyerToken}`)
            .send({ content: 'Hello Seller!' });

        const message = await messagePromise;
        expect(message.content).toBe('Hello Seller!');
        expect(message.senderId).toBe(buyerId);

        sellerSocket.disconnect();
        buyerSocket.disconnect();
    });

    it('should receive real-time notification on purchase', async () => {
        const sellerSocket = createSocket(sellerToken);
        await new Promise<void>((resolve) => sellerSocket.on('connect', () => resolve()));

        const notificationPromise = waitForEvent(sellerSocket, 'new_notification');

        // Trigger purchase via REST
        await request(httpServer)
            .post(`/api/listings/${listingId}/purchase`)
            .set('Authorization', `Bearer ${buyerToken}`)
            .send({ paymentMethod: 'WALLET', useEscrow: false });

        const notification = await notificationPromise;
        expect(notification.type).toBe('TRANSACTION');
        expect(notification.title).toBe('Item Sold!');

        sellerSocket.disconnect();
    });

    it('should receive contract update events', async () => {
        const buyerSocket = createSocket(buyerToken);
        await new Promise<void>((resolve) => buyerSocket.on('connect', () => resolve()));

        // 1. Create contract
        const contractRes = await request(httpServer)
            .post('/api/escrow/smart-contract')
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({
                buyerId,
                sellerId,
                listingId,
                terms: {
                    price: 1000,
                    escrowFee: 50,
                    releaseConditions: ['Delivery confirmed'],
                    disputeResolution: { arbitrationFee: 10, timeout: '48h', thirdPartyArbitration: true }
                }
            });

        const contractId = contractRes.body.id;
        const sellerSocket = createSocket(sellerToken);
        await new Promise<void>((resolve) => sellerSocket.on('connect', () => resolve()));

        // 1. Sign contract via REST (from seller side)
        await request(httpServer)
            .post(`/api/escrow/smart-contract/${contractId}/sign`)
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ signature: 'seller-sign-123' });

        // Prepare promise for the SECOND update (sent to seller because buyer signs)
        const updatePromise = waitForEvent(sellerSocket, 'contract_updated');

        // 2. Sign contract via REST (from buyer side) - this should trigger the SIGNED status
        await request(httpServer)
            .post(`/api/escrow/smart-contract/${contractId}/sign`)
            .set('Authorization', `Bearer ${buyerToken}`)
            .send({ signature: 'buyer-sign-456' });

        const contract = await updatePromise;
        expect(contract.id).toBe(contractId);
        expect(contract.status).toBe('SIGNED');

        buyerSocket.disconnect();
        sellerSocket.disconnect();
    }, 15000);
});
