import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        // Parallel queries for performance
        const [
            companyCount,
            userCount,
            planCount,
            activePlans,
            totalRevenue // Simplified: Sum of price of all companies' plans? Or just a placeholder.
        ] = await prisma.$transaction([
            prisma.company.count(),
            prisma.user.count(),
            prisma.plan.count(),
            prisma.company.count({ where: { isActive: true } }),
            // Revenue calculation might be complex, skipping for now or using a simple estimate
            // Let's just count courses for now as a stat
            prisma.course.count()
        ]);

        return NextResponse.json({
            companies: companyCount,
            users: userCount,
            plans: planCount,
            activeCompanies: activePlans,
            courses: totalRevenue
        });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
