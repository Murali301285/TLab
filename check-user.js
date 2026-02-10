
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
    const email = 'superadmin@3vidya.com';
    console.log(`Checking for user: ${email}`);

    const user = await prisma.user.findFirst({
        where: { email: email },
    });

    if (!user) {
        console.log('User NOT found');
    } else {
        console.log('User found:', user.id, user.email, user.role);
        console.log('Password hash:', user.password);

        // Check if password matches 'password123'
        const isMatch = await bcrypt.compare('password123', user.password);
        console.log(`Password 'password123' match: ${isMatch}`);
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
