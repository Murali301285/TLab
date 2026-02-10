const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backup() {
    console.log('Starting backup...');

    try {
        const users = await prisma.user.findMany();
        const courses = await prisma.course.findMany();
        const chapters = await prisma.chapter.findMany();
        const topics = await prisma.topic.findMany();
        const enrollments = await prisma.enrollment.findMany();
        const quizAttempts = await prisma.quizAttempt.findMany();
        const userProgress = await prisma.userProgress.findMany();
        const categories = await prisma.category.findMany();
        const subCategories = await prisma.subCategory.findMany();
        const departments = await prisma.department.findMany();
        const certificates = await prisma.certificate.findMany();

        const data = {
            users,
            courses,
            chapters,
            topics,
            enrollments,
            quizAttempts,
            userProgress,
            categories,
            subCategories,
            departments,
            certificates
        };

        const backupPath = path.join(__dirname, 'backup_data.json');
        fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
        console.log(`Backup successful! Saved to ${backupPath}`);
        console.log(`Counts: Users ${users.length}, Courses ${courses.length}`);

    } catch (e) {
        console.error('Backup failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

backup();
