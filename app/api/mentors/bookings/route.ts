
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId'); // For now, simple query param or use session

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        const bookings = await prisma.mentorBooking.findMany({
            where: {
                userId: userId
            },
            orderBy: {
                date: 'asc'
            }
        });

        return NextResponse.json({ success: true, data: bookings });

    } catch (error) {
        console.error("Fetch Bookings Error:", error);
        return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }
}
