import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
    try {
        const companies = await prisma.company.findMany({
            include: {
                plan: { select: { name: true } },
                users: {
                    where: { role: 'COMPANY_ADMIN' },
                    select: { id: true, email: true, isActive: true },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Transform for UI
        const formatted = companies.map(c => ({
            ...c,
            adminUser: c.users[0] || null
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            name, shortName, address, contactPerson, isActive, planId, licenseExpiresAt,
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
                    isActive,
                    planId: planId || null,
                    licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
                    apiConfig: groqKey ? { groqKey } : undefined
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
            name, shortName, address, contactPerson, isActive, planId, licenseExpiresAt,
            adminEmail, adminPassword, adminIsActive, resetPassword, groqKey
        } = body;

        // Transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update Company
            const company = await tx.company.update({
                where: { id },
                data: {
                    name, shortName, address, contactPerson, isActive,
                    planId: planId || null,
                    licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
                    apiConfig: groqKey ? { groqKey } : undefined, // overwrite entire json or merge? Using simple overwrite for now 
                }
            });

            // Update Admin User if linked
            // We need to find the admin user for this company. 
            // Assumption: Only one COMPANY_ADMIN or we target by email? 
            // Let's target by finding the COMPANY_ADMIN linked to this company.

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
