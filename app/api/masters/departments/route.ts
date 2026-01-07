
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(departments);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, remarks } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const dept = await prisma.department.create({
            data: {
                name,
                remarks,
                isActive: true
            }
        });

        return NextResponse.json(dept);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, remarks, isActive } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const dept = await prisma.department.update({
            where: { id },
            data: {
                name,
                remarks,
                isActive
            }
        });

        return NextResponse.json(dept);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
    }
}
