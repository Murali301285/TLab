import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const users = await prisma.user.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                managerId: true,
                department: true,
                isActive: true,
                enrollments: {
                    select: {
                        courseId: true,
                    }
                },
                progress: {
                    select: {
                        topicId: true,
                        completed: true
                    }
                }
            }
        });

        const transformedUsers = users.map(user => ({
            ...user,
            department: user.department || 'General',
            status: user.isActive ? 'active' : 'inactive',
            assignedCourses: user.enrollments.map((e: any) => e.courseId),
            completedTopics: user.progress.filter((p: any) => p.completed).map((p: any) => p.topicId)
        }));

        return NextResponse.json(transformedUsers);
    } catch (error) {
        console.error("Fetch Users Error", error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}



export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("Creating user with body:", { ...body, password: '***' }); // Log body minus password

        const { name, email, role, department, password, assignedTeamMembers } = body;

        if (!email || !name) {
            return NextResponse.json({ error: 'Name and Email are required' }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const passwordToHash = password || 'password123';
        const hashedPassword = await bcrypt.hash(passwordToHash, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                role: role || 'student',
                department: department || 'General',
                password: hashedPassword,
                isActive: true
            }
        });

        // If manager and has assignedTeamMembers, update them
        if (assignedTeamMembers && assignedTeamMembers.length > 0) {
            await prisma.user.updateMany({
                where: { id: { in: assignedTeamMembers } },
                data: { managerId: newUser.id }
            });
        }

        return NextResponse.json(newUser);

    } catch (error: any) {
        console.error("Create User Error Detail:", error);
        // Better error message for Prisma errors
        if (error.code === 'P2002') return NextResponse.json({ error: 'Unique constraint failed (email likely exists)' }, { status: 400 });
        if (error.code === 'P2003') return NextResponse.json({ error: 'Foreign key constraint failed' }, { status: 400 });
        return NextResponse.json({ error: `Failed to create user: ${error.message || error}` }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, isActive, role, department, name, managerId, password } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const dataToUpdate: any = {
            isActive: isActive !== undefined ? isActive : undefined,
            role: role || undefined,
            department: department || undefined,
            name: name || undefined,
            managerId: managerId, // Allow null or string
        };

        if (password) {
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        // Clean up undefined
        Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

        const updatedUser = await prisma.user.update({
            where: { id },
            data: dataToUpdate
        });

        return NextResponse.json(updatedUser);

    } catch (error) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete User Error", error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
