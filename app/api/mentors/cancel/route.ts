import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { MENTORS } from '@/data/mockData';
import { sendEmail } from '@/lib/mail';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
        }

        // Fetch the booking first to get details for the email
        const booking = await prisma.mentorBooking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Update booking status to CANCELLED instead of deleting to keep history
        const updatedBooking = await prisma.mentorBooking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' }
        });

        // Trigger Notification Email to Mentor
        const mentor = MENTORS.find((m) => m.id === booking.mentorId);
        if (mentor && mentor.email) {
            const subject = `Mentorship Session Cancelled: ${booking.userEmail}`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #ef4444;">Session Cancelled</h2>
                    <p>Hello <strong>${mentor.name}</strong>,</p>
                    <p>We are writing to inform you that a student has cancelled their upcoming session.</p>
                    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                        <p style="margin: 0 0 10px 0;"><strong>Original Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Time Slot:</strong> ${booking.timeSlot}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Student Email:</strong> ${booking.userEmail}</p>
                    </div>
                    <p>Your calendar has been opened up for this time slot.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b;">
                        Regards,<br/>3Vidya Learning Team
                    </p>
                </div>
            `;

            sendEmail(mentor.email, subject, html).catch((err) => {
                console.error("Failed to send cancellation notification email to mentor:", err);
            });
        }

        return NextResponse.json({ success: true, data: updatedBooking });

    } catch (error) {
        console.error("Cancellation Error:", error);
        return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
    }
}
