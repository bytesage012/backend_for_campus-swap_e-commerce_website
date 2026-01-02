import { PrismaClient, VerificationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Starting seed...');

    // Cleanup
    await (prisma as any).adminLog.deleteMany();
    await (prisma as any).userDevice.deleteMany();
    await (prisma as any).notification.deleteMany();
    await (prisma as any).savedItem.deleteMany();
    await (prisma as any).message.deleteMany();
    await (prisma as any).conversation.deleteMany();
    await (prisma as any).review.deleteMany();
    await (prisma as any).verification.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.listingImage.deleteMany();
    await (prisma as any).report.deleteMany();
    await (prisma as any).listingAnalytics.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.wallet.deleteMany();
    await (prisma as any).preference.deleteMany();
    await prisma.user.deleteMany();

    // Create Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@campus-swap.com',
            password: adminPassword,
            fullName: 'Super Admin',
            isAdmin: true,
            role: 'ADMIN',
            isVerified: true,
            verificationStatus: 'APPROVED',
            trustScore: 100.0,
            wallet: { create: { balance: 0 } },
            preference: { create: {} }
        }
    });

    // Create Users
    const password = await bcrypt.hash('password123', 10);

    // Seller
    const seller = await prisma.user.create({
        data: {
            email: 'seller@unn.edu.ng',
            password,
            fullName: 'Sarah Seller',
            faculty: 'Sciences',
            phoneNumber: '08011111111',
            isVerified: true,
            verificationStatus: 'APPROVED',
            trustScore: 85.0,
            wallet: { create: { balance: 5000 } },
            preference: { create: { themeMode: 'DARK' } }
        }
    });

    // Buyer
    const buyer = await prisma.user.create({
        data: {
            email: 'buyer@unn.edu.ng',
            password,
            fullName: 'Bob Buyer',
            faculty: 'Engineering',
            phoneNumber: '08022222222',
            isVerified: false,
            verificationStatus: 'PENDING',
            trustScore: 50.0,
            wallet: { create: { balance: 15000 } },
            preference: { create: {} }
        }
    });

    // Suspicious User
    const susUser = await prisma.user.create({
        data: {
            email: 'scammer@fake.com',
            password,
            fullName: 'Sketchy Guy',
            riskScore: 85.0,
            trustScore: 10.0,
            wallet: { create: { balance: 0 } },
            preference: { create: {} }
        }
    });

    // Listings
    const laptop = await prisma.listing.create({
        data: {
            sellerId: seller.id,
            title: 'MacBook Pro 2020',
            description: 'Good condition, slightly used.',
            price: 450000,
            category: 'Electronics',
            condition: 'USED',
            status: 'ACTIVE',
            analytics: {
                create: {
                    totalViews: 124,
                    searchViews: 40,
                    directViews: 10
                }
            }
        }
    });

    await prisma.listing.create({
        data: {
            sellerId: seller.id,
            title: 'Calculus Textbook',
            description: 'Must have for 1st year.',
            price: 5000,
            category: 'Books',
            condition: 'NEW',
            status: 'ACTIVE',
            analytics: {
                create: {
                    totalViews: 45,
                    facultyViews: 20
                }
            }
        }
    });

    // Report
    await (prisma as any).report.create({
        data: {
            reporterId: buyer.id,
            reportedUserId: susUser.id,
            reason: 'SCAM',
            description: 'Asked for bank transfer outside app',
            status: 'UNDER_REVIEW',
            priority: 'HIGH'
        }
    });

    // Device
    await (prisma as any).userDevice.create({
        data: {
            userId: admin.id,
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 ... Chrome/120.0',
            lastActive: new Date()
        }
    });

    // Admin Log
    await (prisma as any).adminLog.create({
        data: {
            action: 'SYSTEM_INIT',
            actorId: admin.id,
            details: { message: 'Seed data created' }
        }
    });

    console.log('✅ Seed completed!');
    console.log(`Admin: admin@campus-swap.com / admin123`);
    console.log(`Seller: seller@unn.edu.ng / password123`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
