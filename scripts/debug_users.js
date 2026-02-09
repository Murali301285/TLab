
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany();
        console.log('--- USERS IN DB ---');
        if (users.length === 0) {
            console.log("No users found.");
        }
        users.forEach(u => {
            console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Dept: ${u.department}`);
        });
        console.log('-------------------');
    } catch (e) {
        console.error("Error fetching users:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
