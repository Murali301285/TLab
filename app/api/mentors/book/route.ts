
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { MENTORS } from '@/data/mockData';
import { sendEmail } from '@/lib/mail';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { mentorId, userId, date, timeSlot, userEmail, userPhone, topic } = body;

        // Basic validation
        if (!mentorId || !date || !timeSlot || !userEmail) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const bookingDate = new Date(date);

        // --- CONFLICT VALIDATION ---
        // 1. Check if the Mentor is already booked at this time
        const existingMentorBooking = await prisma.mentorBooking.findFirst({
            where: {
                mentorId,
                date: bookingDate,
                timeSlot,
                status: 'CONFIRMED'
            }
        });

        if (existingMentorBooking) {
            return NextResponse.json({
                error: "This time slot is no longer available for this mentor."
            }, { status: 409 });
        }

        // 2. Check if the User already has ANY booking at this time
        const existingUserBooking = await prisma.mentorBooking.findFirst({
            where: {
                userEmail,
                date: bookingDate,
                timeSlot,
                status: 'CONFIRMED'
            }
        });

        if (existingUserBooking) {
            return NextResponse.json({
                error: "You already have a mentoring session booked at this time."
            }, { status: 409 });
        }

        // Create the booking if no conflicts
        const booking = await prisma.mentorBooking.create({
            data: {
                mentorId,
                userId: userId || undefined, // Optional
                date: bookingDate,
                timeSlot,
                userEmail,
                userPhone,
                topic,
                status: 'CONFIRMED'
            }
        });

        // Trigger Notification Email to Mentor
        const mentor = MENTORS.find((m) => m.id === mentorId);
        if (mentor && mentor.email) {
            const subject = `New Mentorship Booking from ${userEmail}`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #6b21a8;">New Mentorship Session Booked!</h2>
                    <p>Hello <strong>${mentor.name}</strong>,</p>
                    <p>A new student has booked a session with you on the 3Vidya Platform.</p>
                    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Time Slot:</strong> ${timeSlot}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Student Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
                        <p style="margin: 0 0 10px 0;"><strong>Student Phone:</strong> ${userPhone || 'Not provided'}</p>
                        <p style="margin: 0;"><strong>Topic / Questions:</strong></p>
                        <p style="margin: 5px 0 0 0; padding: 10px; background-color: #fff; border: 1px solid #e2e8f0; border-radius: 4px;">
                            ${topic ? topic.replace(/\n/g, '<br/>') : 'No specific topic provided.'}
                        </p>
                    </div>
                    <p>Please be ready to join the session at the scheduled time.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b;">
                        Regards,<br/>3Vidya Learning Team
                    </p>
                </div>
            `;

            // Fire and forget
            sendEmail(mentor.email, subject, html).catch((err) => {
                console.error("Failed to send booking notification email to mentor:", err);
            });
        }

        return NextResponse.json({ success: true, data: booking });

    } catch (error) {
        console.error("Booking Error:", error);
        return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }
}
