
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const { email, password, name, role } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || email.split('@')[0],
                role: role || 'student',
                image: `https://api.dicebear.com/7.x/initials/svg?seed=${name || email}`
            }
        });

        // Auto-enroll in all active courses to ensure they see content immediately
        try {
            const activeCourses = await prisma.course.findMany({
                where: { isActive: true },
                select: { id: true }
            });

            if (activeCourses.length > 0) {
                await prisma.enrollment.createMany({
                    data: activeCourses.map(course => ({
                        userId: user.id,
                        courseId: course.id,
                        assignedAt: new Date()
                    }))
                });
                console.log(`[Auto-Enroll] User ${user.email} enrolled in ${activeCourses.length} courses.`);
            }
        } catch (enrollError) {
            console.error("Auto-enrollment failed:", enrollError);
            // Don't fail the registration if auto-enroll fails, just log it
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json(userWithoutPassword);

    } catch (error) {
        console.error('Registration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
