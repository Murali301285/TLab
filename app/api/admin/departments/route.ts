import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get('companyId');

        const whereClause = companyId ? { companyId } : {};

        const departments = await prisma.department.findMany({
            where: whereClause,
            orderBy: { name: 'asc' },
            include: { company: { select: { name: true } } }
        });
        return NextResponse.json(departments);
    } catch (error) {
        console.error('Department Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, remarks, isActive, companyId } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const department = await prisma.department.create({
            data: {
                name,
                remarks,
                isActive: isActive ?? true,
                companyId: companyId || null
            }
        });
        return NextResponse.json(department);
    } catch (error) {
        console.error('Department Create Error:', error);
        return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const body = await req.json();

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const department = await prisma.department.update({
            where: { id },
            data: {
                name: body.name,
                remarks: body.remarks,
                isActive: body.isActive,
                companyId: body.companyId
            }
        });
        return NextResponse.json(department);
    } catch (error) {
        console.error('Department Update Error:', error);
        return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        // Check if used in User table? (Schema has 'department' string field in User, not relation, keeping simple for now)
        // Ideally check usage before delete, but if it's just a string in User, it won't break FK.

        await prisma.department.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Department Delete Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
