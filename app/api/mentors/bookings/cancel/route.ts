import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mail';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { bookingId, reason } = await req.json();

        if (!bookingId) {
            return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
        }

        // Fetch booking info
        const booking = await prisma.mentorBooking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const mentor = await prisma.mentor.findUnique({
            where: { id: booking.mentorId }
        });

        if (!mentor) {
            return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
        }

        // Update booking status
        const updatedBooking = await prisma.mentorBooking.update({
            where: { id: bookingId },
            data: {
                status: 'CANCELLED'
            }
        });

        // Send Cancellation Email
        if (mentor.email) {
            const subject = `Cancelled: Mentorship Session on ${new Date(booking.date).toLocaleDateString()}`;
            const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo.png');

            const html = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; padding: 20px; text-align: center;">
                    <table align="center" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-collapse: collapse;">
                        
                        <!-- Top Dark Bar -->
                        <tr>
                            <td style="background-color: #1e293b; padding: 15px; text-align: center;">
                                <img src="cid:tlablogo" alt="3VIDYA" style="height: 30px; width: auto; display: inline-block; vertical-align: middle;" />
                            </td>
                        </tr>
                        
                        <!-- Header Red Bar for Cancellation -->
                        <tr>
                            <td style="background-color: #ef4444; padding: 30px 20px 50px 20px; text-align: center; position: relative;">
                                <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 500;">Mentorship Session Cancelled</h2>
                            </td>
                        </tr>

                        <!-- Content Area -->
                        <tr>
                            <td style="padding: 0 40px 40px 40px; text-align: center; background-color: #ffffff;">
                                
                                <!-- Overlapping Calendar Icon with X -->
                                <div style="margin-top: -35px; margin-bottom: 20px; text-align: center;">
                                    <div style="display: inline-block; background-color: #f87171; width: 70px; height: 70px; border-radius: 50%; border: 4px solid #ffffff; line-height: 70px; font-size: 32px; color: #ffffff; text-align: center;">
                                        📅❌
                                    </div>
                                </div>

                                <h3 style="color: #334155; font-size: 18px; text-align: left; margin-bottom: 15px;">Hi ${mentor.name},</h3>
                                
                                <p style="color: #64748b; font-size: 15px; line-height: 1.6; text-align: left; margin-bottom: 25px;">
                                    A student has unfortunately cancelled their upcoming mentorship session with you. This time slot is now available again.
                                </p>

                                <!-- Details Block -->
                                <div style="margin: 30px 0; text-align: center;">
                                    <p style="color: #ef4444; font-size: 18px; font-weight: bold; margin: 0 0 5px 0; text-decoration: line-through;">
                                        ${new Date(booking.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                    <p style="color: #64748b; font-size: 16px; font-weight: bold; margin: 0 0 5px 0;">
                                        ${booking.timeSlot}
                                    </p>
                                    <p style="color: #64748b; font-size: 14px; margin: 0 0 5px 0;">
                                        Student: ${booking.userEmail}
                                    </p>
                                </div>

                                <div style="background-color: #fff1f2; padding: 15px; border-radius: 6px; text-align: left; margin-bottom: 30px; border: 1px solid #fecdd3;">
                                    <p style="margin: 0; color: #9f1239; font-size: 14px;"><strong>Cancellation Reason:</strong><br/>
                                        ${reason || 'No specific reason provided by the student.'}
                                    </p>
                                </div>

                                <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
                                    No action is required from your side. This time slot has been freed on your calendar.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                    &copy; ${new Date().getFullYear()} 3Vidya Learning Platform. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </div>
            `;

            sendEmail(mentor.email, subject, html, [{
                filename: 'logo.png',
                path: logoPath,
                cid: 'tlablogo'
            }]).catch(console.error);
        }

        return NextResponse.json({ success: true, data: { ...updatedBooking, reason } });

    } catch (error) {
        console.error("Cancel Booking Error:", error);
        return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
    }
}
