const { PrismaClient } = require('@prisma/client');
// require('dotenv').config(); // Loaded via node --env-file

const prisma = new PrismaClient();

async function main() {
    console.log('Testing Prisma Connection...');
    try {
        const categories = await prisma.category.findMany({ take: 1 });
        console.log('Successfully connected! Categories count:', categories.length);
        if (categories.length > 0) console.log('First category:', categories[0]);

        console.log('Testing Admin Courses Query...');
        const courses = await prisma.course.findMany({
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
                _count: { select: { enrollments: true, chapters: true } },
                subCategory: { include: { category: true } }
            }
        });
        console.log('Courses found:', courses.length);
        if (courses.length > 0) {
            console.log('First course sample:', JSON.stringify(courses[0], null, 2));
        }
    } catch (e) {
        console.error('Prisma Connection Failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
