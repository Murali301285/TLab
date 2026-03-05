import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Publicly accessible route to get active mentors with their availability
export async function GET() {
    try {
        const mentors = await prisma.mentor.findMany({
            where: { isActive: true },
            include: { availabilities: true },
            orderBy: [
                { isTopMentor: 'desc' },
                { name: 'asc' }
            ]
        });

        // We format it slightly to match the expected mock format if necessary,
        // or just return as is.
        return NextResponse.json(mentors);
    } catch (error) {
        console.error('Error fetching mentors:', error);
        return NextResponse.json({ error: 'Failed to fetch mentors' }, { status: 500 });
    }
}
