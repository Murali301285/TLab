import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret');

async function getCurrentUser(req: NextRequest) {
    const token = req.cookies.get('token')?.value; // Check cookie name 'token' or 'auth-token' depending on your auth setup. Middleware sets 'auth-token'??
    // Middleware in step 873 checks 'auth-token'. AuthProvider usually sets 'token'.
    // Let's check both or use 'auth-token' if that's the standard.
    // AuthProvider usually sets 'token'. Middleware checks 'auth-token'. This is inconsistent? 
    // Wait, let me check AuthProvider.
    // Assuming 'token' based on previous API route I wrote.
    const cookie = req.cookies.get('token')?.value || req.cookies.get('auth-token')?.value;
    if (!cookie) return null;
    try {
        const { payload } = await jwtVerify(cookie, JWT_SECRET);
        return payload as { id: string; email: string; role: string; companyId: string };
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const where: any = {};
        if (user.role !== 'SUPER_ADMIN' && user.companyId) {
            where.companyId = user.companyId;
        }
        // If SUPER_ADMIN, fetch all. Or maybe we want to fetch global ones too?
        // For simplicity, Company Admin sees ONLY their company's departments.

        const departments = await prisma.department.findMany({
            where,
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(departments);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { name, remarks } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const data: any = {
            name,
            remarks,
            isActive: true
        };

        if (user.role !== 'SUPER_ADMIN') {
            if (!user.companyId) return NextResponse.json({ error: 'Company ID missing' }, { status: 400 });
            data.companyId = user.companyId;
        }
        // Super Admin creates global departments (companyId: null) or needs UI to select company.
        // Current UI doesn't support selecting company. So Super Admin creates global ones.

        const dept = await prisma.department.create({
            data
        });

        return NextResponse.json(dept);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { id, name, remarks, isActive } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        // Verify ownership
        const existing = await prisma.department.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (user.role !== 'SUPER_ADMIN' && existing.companyId !== user.companyId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

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
