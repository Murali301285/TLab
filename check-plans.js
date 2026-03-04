const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany();
  console.log('--- Current Plans ---');
  plans.forEach(p => {
    console.log(`Plan: ${p.name} (ID: ${p.id})`);
    console.log(`  Token Limit (Total): ${p.tokenLimit}`);
    console.log(`  Token Limit (Monthly): ${p.tokenLimitMonthly}`);
    console.log(`  Token Limit (Yearly): ${p.tokenLimitYearly}`);
    console.log('-----------------------------------');
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
