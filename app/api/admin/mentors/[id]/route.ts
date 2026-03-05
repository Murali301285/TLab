import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

async function getCurrentUser(req: NextRequest) {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { id: string; email: string; role: string; companyId: string };
    } catch {
        return null;
    }
}

// UPDATE Mentor by ID
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const user = await getCurrentUser(req);
        if (!user || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();

        // Prevent duplicate email issues if changing email
        if (body.email) {
            const existing = await prisma.mentor.findFirst({
                where: { email: body.email, id: { not: id } }
            });
            if (existing) {
                return NextResponse.json({ error: 'Another mentor is already using this email' }, { status: 409 });
            }
        }

        // We use a single nested Prisma query to delete old availabilities and recreate them
        // This prevents transaction deadlocks
        const updatedMentor = await prisma.mentor.update({
            where: { id: id },
            data: {
                name: body.name,
                email: body.email,
                designation: body.designation,
                organization: body.organization,
                bio: body.bio,
                photoUrl: body.photoUrl,
                expertise: body.expertise,
                isTopMentor: body.isTopMentor,
                isActive: body.isActive,
                availabilities: body.availabilities ? {
                    deleteMany: {}, // Clear all existing linked availabilities
                    create: body.availabilities.map((a: any) => ({
                        type: a.type,
                        dayOfWeek: a.dayOfWeek,
                        date: a.date ? new Date(a.date) : null,
                        timeSlots: a.timeSlots || [],
                        isRecursive: a.isRecursive || false,
                        recurrenceEnd: a.recurrenceEnd ? new Date(a.recurrenceEnd) : null
                    }))
                } : undefined
            },
            include: {
                availabilities: true
            }
        });

        return NextResponse.json(updatedMentor);
    } catch (error) {
        console.error('Error updating mentor:', error);
        return NextResponse.json({ error: 'Failed to update mentor' }, { status: 500 });
    }
}

// DELETE Mentor by ID
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const user = await getCurrentUser(req);
        if (!user || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check if there are active bookings
        const bookings = await prisma.mentorBooking.findMany({
            where: { mentorId: id, status: { notIn: ['COMPLETED', 'CANCELLED'] } }
        });

        if (bookings.length > 0) {
            return NextResponse.json({
                error: 'Cannot delete mentor with active future bookings. Please mark as inactive instead or cancel their bookings.'
            }, { status: 400 });
        }

        await prisma.mentor.delete({
            where: { id: id }
        });

        return NextResponse.json({ success: true, message: 'Mentor deleted successfully' });
    } catch (error) {
        console.error('Error deleting mentor:', error);
        return NextResponse.json({ error: 'Failed to delete mentor' }, { status: 500 });
    }
}
