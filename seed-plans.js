const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Seeding Currencies...');

        let inr = await prisma.currency.upsert({
            where: { code: 'INR' },
            update: {},
            create: { code: 'INR', symbol: '₹', name: 'Indian Rupee', isActive: true }
        });

        let usd = await prisma.currency.upsert({
            where: { code: 'USD' },
            update: {},
            create: { code: 'USD', symbol: '$', name: 'US Dollar', isActive: true }
        });

        console.log('Seeding Plans...');

        // Clean up old plans if needed or just upsert
        // For now, let's just create if not exists

        const plans = [
            { lno: 1, name: 'Basic', userLimit: 5, tokenLimit: 50000, storageLimitMB: 500, courseLimit: 2, libraryLimit: 5, policyLimit: 2, allowTempUser: false, isActive: true, costPerMonth: 0, costPerYear: 0, currencyId: usd.id },
            { lno: 2, name: 'Standard', userLimit: 20, tokenLimit: 200000, storageLimitMB: 2048, courseLimit: 10, libraryLimit: 20, policyLimit: 10, allowTempUser: true, isActive: true, costPerMonth: 29, costPerYear: 290, currencyId: usd.id },
            { lno: 3, name: 'Premium', userLimit: 50, tokenLimit: 500000, storageLimitMB: 5120, courseLimit: 25, libraryLimit: 50, policyLimit: 25, allowTempUser: true, isActive: true, costPerMonth: 79, costPerYear: 790, currencyId: usd.id },
            { lno: 4, name: 'Enterprise', userLimit: 10000, tokenLimit: 10000000, storageLimitMB: 102400, courseLimit: 1000, libraryLimit: 1000, policyLimit: 1000, allowTempUser: true, isActive: true, costPerMonth: 199, costPerYear: 1990, currencyId: usd.id },
        ];

        for (const p of plans) {
            await prisma.plan.upsert({
                where: { name: p.name },
                update: {
                    lno: p.lno,
                    userLimit: p.userLimit,
                    tokenLimit: p.tokenLimit,
                    storageLimitMB: p.storageLimitMB,
                    courseLimit: p.courseLimit,
                    libraryLimit: p.libraryLimit,
                    policyLimit: p.policyLimit,
                    allowTempUser: p.allowTempUser,
                    costPerMonth: p.costPerMonth,
                    costPerYear: p.costPerYear,
                    currencyId: p.currencyId
                },
                create: p
            });
        }

        console.log('Seeding completed.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
