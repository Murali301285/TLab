const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function restore() {
    console.log('Starting restore & seed for vidya_live...');

    try {
        // 1. Create Standard Plan
        console.log('Creating Standard Plan...');
        const plan = await prisma.plan.upsert({
            where: { name: 'Standard' },
            update: {},
            create: {
                name: 'Standard',
                userLimit: 100,
                tokenLimit: 1000000,
                storageLimitMB: 5000,
                price: 99.00
            }
        });

        // 2. Create Default '3vidya' Company
        console.log('Creating Default Company...');
        const company = await prisma.company.upsert({
            where: { shortName: '3vidya' },
            update: {},
            create: {
                name: '3Vidya Learning Solutions',
                shortName: '3vidya',
                planId: plan.id,
                isActive: true,
                licenseActiveOn: new Date(),
                licenseExpiresAt: new Date('2030-12-31') // 2030 Validity
            }
        });

        // 3. Create Super Admin
        console.log('Creating Super Admin...');
        const hashedPassword = await bcrypt.hash('SA@3v', 10);
        await prisma.user.upsert({
            where: { email: 'superadmin@3vidya.com' },
            update: {},
            create: {
                email: 'superadmin@3vidya.com',
                password: hashedPassword,
                name: 'Super Admin',
                role: 'SUPER_ADMIN',
                companyId: company.id
            }
        });

        // 4. Restore Data
        const backupPath = path.join(__dirname, 'backup_data.json');
        if (fs.existsSync(backupPath)) {
            const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            console.log(`Restoring ${data.users.length} users and ${data.courses.length} courses...`);

            // Restore Masters first (Category, SubCategory, Department, Certificate) -> Associate with default company if needed
            // Note: Category/SubCategory are global in schema? No, checked schema, they are global. Department is Company scoped.

            // Categories
            for (const cat of data.categories) {
                await prisma.category.upsert({
                    where: { id: cat.id },
                    update: {},
                    create: { ...cat }
                }).catch(e => console.warn(`Skipping cat ${cat.name}: ${e.message}`));
            }

            // SubCategories
            for (const sub of data.subCategories) {
                await prisma.subCategory.upsert({
                    where: { id: sub.id },
                    update: {},
                    create: { ...sub }
                }).catch(e => console.warn(`Skipping sub ${sub.name}: ${e.message}`));
            }

            // Restore Users (Skip if exists)
            for (const u of data.users) {
                if (u.email === 'superadmin@3vidya.com') continue;

                // Default existing users to 'USER' role unless they were 'admin' before
                // Mapping old roles to new structure if needed, but for now assign to company
                const existing = await prisma.user.findUnique({ where: { email: u.email } });
                if (!existing) {
                    const { id, companyId, ...userData } = u; // Exclude ID to let new DB generate? Or keep ID to maintain relations? 
                    // BETTER: Keep ID to maintain relations with Course/Enrollment backups

                    await prisma.user.create({
                        data: {
                            ...u,
                            companyId: company.id, // Assign to 3vidya
                            role: u.role === 'admin' ? 'COMPANY_ADMIN' : (u.role === 'manager' ? 'MANAGER' : 'USER')
                        }
                    });
                }
            }

            // Restore Departments (Link to Company)
            for (const d of data.departments) {
                // Check if dept exists in this company
                const existing = await prisma.department.findFirst({ where: { name: d.name, companyId: company.id } });
                if (!existing) {
                    const { id, companyId, ...deptData } = d;
                    // We might need to map old IDs to new IDs if we don't force ID. 
                    // BUT, user has dept ID relations. 
                    // Try to create with same ID first.
                    try {
                        await prisma.department.create({
                            data: { ...d, companyId: company.id }
                        });
                    } catch (e) {
                        // If ID conflict or other issue, create new and we might lose linkage unless we map.
                        // For simplicity in this 'move', we try to keep IDs.
                        console.log(`Failed to restore dept ${d.name}, skipping foundation ID.`);
                    }
                }
            }

            // Restore Courses
            for (const c of data.courses) {
                const existing = await prisma.course.findUnique({ where: { id: c.id } });
                if (!existing) {
                    await prisma.course.create({
                        data: {
                            ...c,
                            companyId: company.id
                        }
                    });
                }
            }

            // Restore Chapters, Topics (Cascade usually handles deletion, but creation needs parent)
            // Since we kept Course IDs, we can keep Chapter IDs.
            for (const ch of data.chapters) {
                await prisma.chapter.create({ data: ch }).catch(e => { });
            }
            for (const t of data.topics) {
                await prisma.topic.create({ data: t }).catch(e => { });
            }

            // Enrollments
            for (const e of data.enrollments) {
                await prisma.enrollment.create({ data: e }).catch(err => console.log(`Enrollment skip: ${err.message}`));
            }

            // Quiz Attempts
            for (const qa of data.quizAttempts) {
                // Need to separate topicName/quizData? No, schema matches.
                // Note: `quizData` is Json.
                await prisma.quizAttempt.create({ data: qa }).catch(err => console.log(`QA skip: ${err.message}`));
            }

            console.log('Data restore completed.');
        }

    } catch (e) {
        console.error('Restore failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

restore();
