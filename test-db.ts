import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        const users = await prisma.user.findMany();
        console.log('Successfully connected to DB. User count:', users.length);
    } catch (error) {
        console.error('DB connection failed:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
