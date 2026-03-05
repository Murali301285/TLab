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

// GET all mentors for the Admin Master
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser(req);
        if (!user || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const mentors = await prisma.mentor.findMany({
            include: {
                availabilities: true,
                bookings: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(mentors);
    } catch (error) {
        console.error('Error fetching mentors:', error);
        return NextResponse.json({ error: 'Failed to fetch mentors' }, { status: 500 });
    }
}

// CREATE a new mentor
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser(req);
        if (!user || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();

        // Basic Validation
        if (!body.name || !body.email || !body.designation || !body.organization) {
            return NextResponse.json({ error: 'Name, email, designation, and organization are required' }, { status: 400 });
        }

        // Check Unique Email
        const existing = await prisma.mentor.findUnique({
            where: { email: body.email }
        });

        if (existing) {
            return NextResponse.json({ error: 'A mentor with this email already exists' }, { status: 409 });
        }

        // Create Mentor transaction
        const newMentor = await prisma.mentor.create({
            data: {
                name: body.name,
                email: body.email,
                designation: body.designation,
                organization: body.organization,
                bio: body.bio || '',
                photoUrl: body.photoUrl || '/murali.png', // Fallback
                expertise: body.expertise || [],
                isTopMentor: body.isTopMentor || false,
                isActive: body.isActive ?? true,
                availabilities: body.availabilities?.length > 0 ? {
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

        return NextResponse.json(newMentor, { status: 201 });
    } catch (error) {
        console.error('Error creating mentor:', error);
        return NextResponse.json({ error: 'Failed to create mentor' }, { status: 500 });
    }
}
