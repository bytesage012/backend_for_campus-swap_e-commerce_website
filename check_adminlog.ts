
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env manually since we might be running from root
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        console.log('Checking connection...');
        await prisma.$connect();
        console.log('Connected.');

        console.log('Attempting to count AdminLog...');
        // Access as any to avoid TS errors if types aren't fully generated yet in editor logic, 
        // but runtime should work if generated.
        const count = await (prisma as any).adminLog.count();
        console.log(`AdminLog count: ${count}`);

        console.log('Attempting to delete from AdminLog...');
        await (prisma as any).adminLog.deleteMany();
        console.log('Successfully deleted from AdminLog');
    } catch (e) {
        console.error('Error executing matching logic:', e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
