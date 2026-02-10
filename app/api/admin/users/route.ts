import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret');

// Helper to get current user from token
async function getCurrentUser(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { id: string; email: string; role: string; companyId: string };
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user || !user.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                companyId: user.companyId,
                // Optional: Exclude the current user or super admins if needed
                // role: { not: 'SUPER_ADMIN' } 
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user || !user.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: Only Company Admin or Super Admin can create users
    if (user.role !== 'COMPANY_ADMIN' && user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, email, password, role, department } = body;

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check availability
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'USER',
                department,
                companyId: user.companyId,
                isActive: true,
            },
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;

        return NextResponse.json(userWithoutPassword);
    } catch (error) {
        console.error("Create user error:", error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user || !user.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'COMPANY_ADMIN' && user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id, name, role, department, isActive, password } = body; // Email usually not editable to prevent identity swap issues easily, but can be if needed.

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Verify user belongs to company
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser || targetUser.companyId !== user.companyId) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const data: any = {};
        if (name) data.name = name;
        if (role) data.role = role;
        if (department) data.department = department;
        if (typeof isActive === 'boolean') data.isActive = isActive;
        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data,
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        return NextResponse.json(userWithoutPassword);
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
