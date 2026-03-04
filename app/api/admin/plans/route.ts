import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const count = await prisma.plan.count();
        if (count === 0) {
            // Seed default plans
            await prisma.plan.createMany({
                data: [
                    { lno: 1, name: 'Basic', userLimit: 5, tokenLimit: 50000, storageLimitMB: 500, courseLimit: 2, libraryLimit: 5, policyLimit: 2, allowTempUser: false, isActive: true },
                    { lno: 2, name: 'Standard', userLimit: 20, tokenLimit: 200000, storageLimitMB: 2048, courseLimit: 10, libraryLimit: 20, policyLimit: 10, allowTempUser: true, isActive: true },
                    { lno: 3, name: 'Premium', userLimit: 50, tokenLimit: 500000, storageLimitMB: 5120, courseLimit: 25, libraryLimit: 50, policyLimit: 25, allowTempUser: true, isActive: true },
                    { lno: 4, name: 'Enterprise', userLimit: 10000, tokenLimit: 10000000, storageLimitMB: 102400, courseLimit: 1000, libraryLimit: 1000, policyLimit: 1000, allowTempUser: true, isActive: true },
                ]
            });
        }

        const plans: any[] = await prisma.$queryRaw`
            SELECT p.*,
            json_build_object('id', c.id, 'code', c.code, 'symbol', c.symbol) as currency
            FROM "Plan" p
            LEFT JOIN "Currency" c ON p."currencyId" = c.id
            ORDER BY p.lno ASC
        `;

        // Normalize data if necessary (e.g. casing) - Prisma raw usually returns DB casing
        // Assuming DB columns match model fields (camelCase or "quoted" names)

        return NextResponse.json(plans);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const plan = await prisma.plan.create({ data: body });
        return NextResponse.json(plan);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const body = await req.json();

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const plan = await prisma.plan.update({
            where: { id },
            data: {
                lno: body.lno,
                // name: body.name, // Name is unique/fixed
                userLimit: body.userLimit,
                tokenLimit: body.tokenLimit,
                tokenLimitMonthly: body.tokenLimitMonthly,
                tokenLimitYearly: body.tokenLimitYearly,
                storageLimitMB: body.storageLimitMB,
                singleFileLimitMB: body.singleFileLimitMB,
                courseLimit: body.courseLimit,
                libraryLimit: body.libraryLimit,
                policyLimit: body.policyLimit,
                allowTempUser: body.allowTempUser,
                costPerMonth: body.costPerMonth,
                costPerYear: body.costPerYear,
                currencyId: body.currencyId,
                // coachConfig: body.coachConfig, // Removed to avoid stale client issues
                isActive: body.isActive
            } as any
        });

        // Force update coachConfig using raw query to bypass stale client types
        if (body.coachConfig) {
            const configJson = JSON.stringify(body.coachConfig);
            await prisma.$executeRaw`UPDATE "Plan" SET "coachConfig" = ${configJson}::jsonb WHERE id = ${id}`;
        }

        return NextResponse.json(plan);
    } catch (error) {
        console.error('Plan Update Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Check for usage
        const count = await prisma.company.count({ where: { planId: id } });
        if (count > 0) return NextResponse.json({ error: 'Plan is in use' }, { status: 400 });

        await prisma.plan.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
