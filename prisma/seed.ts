
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
                // id: u.id, // Let Prisma generate ID to avoid conflicts if ID is not critical for seed
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
                // Assign to first admin or specific user - find by email to be safe
                // authorId: USERS[0].id, // This ID might not exist if we let Prisma generate IDs
                author: { connect: { email: USERS[0].email } },
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

    // 3. Seed Departments (Global)
    const globalDepartments = ['Sales', 'Engineering', 'HR', 'Operations'];
    for (const deptName of globalDepartments) {
        // Since name is not unique globally anymore (composite with companyId?), 
        // we might not actally want to seed them strictly this way if schema changed.
        // But assuming we want global defaults? Or linked to default company?
        // Let's link them to default company to be safe and "valid"
        // But we don't have defaultCompany yet. 
        // Reordering: Move Department seeding AFTER Default Company creation.
    }
    // MOVED TO END

    // 4. Migrate Existing Users to link with Departments (Standardize Naming)
    const allUsers = await prisma.user.findMany();
    for (const user of allUsers) {
        if (user.department) {
            // Find a matching department case-insensitively
            const match = globalDepartments.find(d => d.toLowerCase() === user.department?.toLowerCase());
            if (match && match !== user.department) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { department: match }
                });
                console.log(`Updated user ${user.email}: ${user.department} -> ${match}`);
            }
        }
    }

    // 4. Default Company & Super Admin
    const defaultPlan = await prisma.plan.upsert({
        where: { name: 'Enterprise' },
        update: {},
        create: {
            name: 'Enterprise',
            userLimit: 1000,
            tokenLimit: 1000000,
            price: 999.00
        }
    });

    const defaultCompany = await prisma.company.upsert({
        where: { shortName: '3vidya' },
        update: {},
        create: {
            name: '3Vidya Learning Solutions',
            shortName: '3vidya',
            planId: defaultPlan.id,
            isActive: true,
            licenseExpiresAt: new Date('2030-12-31')
        }
    });

    const superAdminPass = await bcrypt.hash('admin123', 10);

    // Check if superadmin exists, if so update, else create
    const existingSuperAdmin = await prisma.user.findUnique({ where: { email: 'superadmin@3vidya.com' } });
    if (existingSuperAdmin) {
        await prisma.user.update({
            where: { email: 'superadmin@3vidya.com' },
            data: {
                role: 'SUPER_ADMIN',
                companyId: defaultCompany.id
            }
        });
    } else {
        await prisma.user.create({
            data: {
                email: 'superadmin@3vidya.com',
                name: 'Super Admin',
                password: superAdminPass,
                role: 'SUPER_ADMIN',
                companyId: defaultCompany.id, // Direct assignment if schema allows, or connect
                isActive: true
            }
        });
    }
    console.log('Created Super Admin: superadmin@3vidya.com / admin123');

    // Also link legacy admin to default company if not linked
    await prisma.user.update({
        where: { email: 'admin@tlab.com' },
        data: { companyId: defaultCompany.id, role: 'SUPER_ADMIN' }
    });

    // 5. Seed Departments (Linked to Default Company)
    const departments = ['Sales', 'Engineering', 'HR', 'Operations'];
    for (const deptName of departments) {
        // Create if not exists for this company
        const existing = await prisma.department.findFirst({
            where: { name: deptName, companyId: defaultCompany.id }
        });

        if (!existing) {
            await prisma.department.create({
                data: {
                    name: deptName,
                    remarks: 'Default Department',
                    isActive: true,
                    companyId: defaultCompany.id
                }
            });
            console.log(`Ensured Department: ${deptName}`);
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
