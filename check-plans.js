const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking Currencies...');
        const currencies = await prisma.currency.findMany();
        console.log('Currencies:', currencies);

        console.log('\nChecking Plans...');
        const plans = await prisma.plan.findMany({
            include: { currency: true }
        });
        console.log('Plans:', JSON.stringify(plans, null, 2));

        if (plans.length === 0) {
            console.log('\nNo plans found. Seeding triggered in API should work if count is 0.');
        } else {
            console.log(`\nFound ${plans.length} plans.`);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
