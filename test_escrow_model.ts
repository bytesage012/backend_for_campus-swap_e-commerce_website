import { PrismaClient, EscrowStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('EscrowStatus:', EscrowStatus);
    try {
        const tx = await prisma.transaction.findFirst({
            where: {
                escrowStatus: EscrowStatus.PENDING
            }
        });
        console.log('Successfully queried with new field');
    } catch (e) {
        console.error(e);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
