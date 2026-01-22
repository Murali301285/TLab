
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { mentorId, userId, date, timeSlot, userEmail, userPhone, topic } = body;

        // Basic validation
        if (!mentorId || !date || !timeSlot || !userEmail) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const booking = await prisma.mentorBooking.create({
            data: {
                mentorId,
                userId: userId || undefined, // Optional
                date: new Date(date),
                timeSlot,
                userEmail,
                userPhone,
                topic,
                status: 'CONFIRMED'
            }
        });

        return NextResponse.json({ success: true, data: booking });

    } catch (error) {
        console.error("Booking Error:", error);
        return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }
}
