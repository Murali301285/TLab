import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const mentorId = params.id;

        if (!mentorId) {
            return NextResponse.json({ error: "Mentor ID is required" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get('date');

        let whereClause: any = {
            mentorId: mentorId,
            status: 'CONFIRMED'
        };

        if (dateParam) {
            const queryDate = new Date(dateParam);
            // Ensure we match the exact date (ignoring time if we store pure dates, or match the day range)
            const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
            whereClause.date = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        const bookings = await prisma.mentorBooking.findMany({
            where: whereClause,
            select: {
                id: true,
                date: true,
                timeSlot: true,
                status: true,
                // Do not expose user details for privacy
            }
        });

        return NextResponse.json({ success: true, data: bookings });

    } catch (error) {
        console.error("Fetch Mentor Bookings Error:", error);
        return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }
}
