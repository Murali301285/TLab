import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt } from '@/lib/crypto'; // Import crypto

export async function GET(req: NextRequest) {
    try {
        const companies = await prisma.company.findMany({
            include: {
                plan: true,
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Parallel fetch for detailed stats
        const formatted = await Promise.all(companies.map(async (c) => {
            // Courses, Library, Policy counts
            const courseStats = await prisma.course.groupBy({
                by: ['type', 'isCompliance'],
                where: { companyId: c.id },
                _count: true
            });

            let coursesCount = 0;
            let libraryCount = 0;
            let policyCount = 0;

            courseStats.forEach(stat => {
                if (stat.type === 'COURSE') coursesCount += stat._count;
                if (stat.type === 'LIBRARY') libraryCount += stat._count;
                if (stat.isCompliance) policyCount += stat._count; // Assuming Policy = Compliance Docs
            });

            // Token Usage (Aggregate from Users)
            const tokenStat = await prisma.tokenUsage.aggregate({
                _sum: { tokens: true },
                where: { user: { companyId: c.id } }
            });

            // Admin User (Single)
            const adminUser = await prisma.user.findFirst({
                where: { companyId: c.id, role: 'COMPANY_ADMIN' },
                select: { id: true, email: true, isActive: true }
            });

            // Decrypt API Key if present
            let apiConfig = c.apiConfig as any;
            if (apiConfig && apiConfig.groqKey) {
                apiConfig = { ...apiConfig, groqKey: decrypt(apiConfig.groqKey) };
            }

            return {
                ...c,
                apiConfig, // Return decrypted config
                adminUser: adminUser || null,
                stats: {
                    users: c._count.users,
                    courses: coursesCount,
                    library: libraryCount,
                    policy: policyCount,
                    tokens: tokenStat._sum.tokens || 0,
                    storageUsed: 0, // Placeholder, implementation needed for file size tracking
                }
            };
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Company Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            name, shortName, address, contactPerson, contactPhone, isActive, planId, licenseExpiresAt,
            adminEmail, adminPassword, groqKey
        } = body;

        // Validation
        const existingShort = await prisma.company.findUnique({ where: { shortName } });
        if (existingShort) return NextResponse.json({ error: 'Short Name must be unique' }, { status: 400 });

        // Transaction to create Company + Admin
        const result = await prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
                data: {
                    name,
                    shortName,
                    address,
                    contactPerson,
                    contactPhone,
                    isActive,
                    planId: planId || null,
                    licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
                    apiConfig: groqKey ? { groqKey: encrypt(groqKey) } : undefined
                }
            });

            if (adminEmail && adminPassword) {
                const existingUser = await tx.user.findUnique({ where: { email: adminEmail } });
                if (existingUser) throw new Error('Admin Email already exists');

                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                await tx.user.create({
                    data: {
                        email: adminEmail,
                        password: hashedPassword,
                        name: 'Company Admin',
                        role: 'COMPANY_ADMIN',
                        companyId: company.id,
                        isActive: true
                    }
                });
            }
            return company;
        });

        return NextResponse.json(result);

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const body = await req.json();
        const {
            name, shortName, address, contactPerson, contactPhone, isActive, planId, licenseExpiresAt,
            adminEmail, adminPassword, adminIsActive, resetPassword, groqKey
        } = body;

        // Transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update Company - RENAMED VARIABLE
            const updatedCompany = await tx.company.update({
                where: { id },
                data: {
                    name, shortName, address, contactPerson, contactPhone, isActive,
                    planId: planId || null,
                    licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
                    apiConfig: groqKey ? { groqKey: encrypt(groqKey) } : undefined,
                }
            });

            // Update Admin User if linked
            const adminUser = await tx.user.findFirst({
                where: { companyId: id, role: 'COMPANY_ADMIN' }
            });

            if (adminUser) {
                const updateData: any = { isActive: adminIsActive };
                if (resetPassword && adminPassword) {
                    updateData.password = await bcrypt.hash(adminPassword, 10);
                }

                await tx.user.update({
                    where: { id: adminUser.id },
                    data: updateData
                });
            } else if (adminEmail && adminPassword) {
                // If no admin existed, create one
                const existingUser = await tx.user.findUnique({ where: { email: adminEmail } });
                if (existingUser) throw new Error('Email already in use');

                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                await tx.user.create({
                    data: {
                        email: adminEmail,
                        password: hashedPassword,
                        name: 'Company Admin',
                        role: 'COMPANY_ADMIN',
                        companyId: updatedCompany.id,
                        isActive: true
                    }
                });
            }

            return updatedCompany;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
    }
}
