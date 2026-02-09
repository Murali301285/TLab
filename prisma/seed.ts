
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { USERS, COURSES } from '../data/mockData'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    // 1. Seed Users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('Admin@2025', 10);

    // Create specific Admin User
    await prisma.user.upsert({
        where: { email: 'admin@tlab.com' },
        update: {},
        create: {
            email: 'admin@tlab.com',
            name: 'Admin',
            password: adminPassword,
            role: 'admin',
        }
    });

    for (const u of USERS) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                id: u.id,
                email: u.email,
                name: u.name,
                password: hashedPassword,
                role: u.role,
                managerId: u.managerId
            },
        })
        console.log(`Created user with id: ${user.id}`)
    }

    // 2. Seed Courses (Take the first one as demo)
    const demoCourse = COURSES[0];
    if (demoCourse) {
        const courseFn = await prisma.course.upsert({
            where: { id: demoCourse.id },
            update: {},
            create: {
                id: demoCourse.id,
                title: demoCourse.title,
                // description: demoCourse.description, // Removed as it's missing in Mock
                category: demoCourse.category,
                // Assign to first admin or specific user
                authorId: USERS[0].id,
                chapters: {
                    create: demoCourse.chapters.map((ch: any) => ({
                        title: ch.title,
                        topics: {
                            create: ch.topics.map((t: any) => ({
                                title: t.title,
                                type: t.type || 'text',
                                content: t.content ? JSON.stringify(t.content) : ''
                            }))
                        }
                    }))
                }
            }
        })
        console.log(`Created course: ${courseFn.title}`)
    }

    // 3. Seed Departments
    const departments = ['Sales', 'Engineering', 'HR', 'Operations'];
    for (const deptName of departments) {
        await prisma.department.upsert({
            where: { name: deptName },
            update: {},
            create: {
                name: deptName,
                remarks: 'Default Department',
                isActive: true
            }
        });
        console.log(`Ensured Department: ${deptName}`);
    }

    // 4. Migrate Existing Users to link with Departments (Standardize Naming)
    const allUsers = await prisma.user.findMany();
    for (const user of allUsers) {
        if (user.department) {
            // Find a matching department case-insensitively
            const match = departments.find(d => d.toLowerCase() === user.department?.toLowerCase());
            if (match && match !== user.department) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { department: match }
                });
                console.log(`Updated user ${user.email}: ${user.department} -> ${match}`);
            }
        }
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
