
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

        // Generate a unique Open-Source Jitsi Meet Session Link
        const uniqueMeetingId = '3vidya-mentorship-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const meetingLink = `https://meet.jit.si/${uniqueMeetingId}`;

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
                status: 'CONFIRMED',
                meetingLink
            }
        });

        // Trigger Notification Email to Mentor
        const mentor = await prisma.mentor.findUnique({
            where: { id: mentorId }
        });

        if (mentor && mentor.email) {
            const subject = `New Mentorship Booking: ${new Date(date).toLocaleDateString()} at ${timeSlot}`;
            const html = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; padding: 20px; text-align: center;">
                    <table align="center" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-collapse: collapse;">
                        
                        <!-- Top Dark Bar -->
                        <tr>
                            <td style="background-color: #1e293b; padding: 15px; text-align: center;">
                                <img src="cid:tlablogo" alt="3VIDYA" style="height: 30px; width: auto; display: inline-block; vertical-align: middle;" />
                            </td>
                        </tr>
                        
                        <!-- Header Blue Bar -->
                        <tr>
                            <td style="background-color: #3b82f6; padding: 30px 20px 50px 20px; text-align: center; position: relative;">
                                <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 500;">New Mentorship Session Booked</h2>
                            </td>
                        </tr>

                        <!-- Content Area -->
                        <tr>
                            <td style="padding: 0 40px 40px 40px; text-align: center; background-color: #ffffff;">
                                
                                <!-- Overlapping Calendar Icon (Simulated with absolute positioning via margins) -->
                                <div style="margin-top: -35px; margin-bottom: 20px; text-align: center;">
                                    <div style="display: inline-block; background-color: #0ea5e9; width: 70px; height: 70px; border-radius: 50%; border: 4px solid #ffffff; line-height: 70px; font-size: 32px; color: #ffffff; text-align: center;">
                                        📅
                                    </div>
                                </div>

                                <h3 style="color: #334155; font-size: 18px; text-align: left; margin-bottom: 15px;">Hi ${mentor.name},</h3>
                                
                                <p style="color: #64748b; font-size: 15px; line-height: 1.6; text-align: left; margin-bottom: 25px;">
                                    A student has successfully scheduled an upcoming mentorship session with you. Please find the details of the appointment below.
                                </p>

                                <!-- Details Block -->
                                <div style="margin: 30px 0; text-align: center;">
                                    <p style="color: #65a30d; font-size: 18px; font-weight: bold; margin: 0 0 5px 0;">
                                        ${new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                    <p style="color: #334155; font-size: 16px; font-weight: bold; margin: 0 0 5px 0;">
                                        ${timeSlot}
                                    </p>
                                    <p style="color: #64748b; font-size: 14px; margin: 0 0 5px 0;">
                                        ${userEmail}
                                    </p>
                                    <p style="color: #64748b; font-size: 14px; margin: 0 0 15px 0;">
                                        ${userPhone || 'No phone provided'}
                                    </p>
                                </div>

                                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; text-align: left; margin-bottom: 30px; border: 1px solid #e2e8f0;">
                                    <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Student's Questions/Topic:</strong><br/>
                                        ${topic ? topic.replace(/\n/g, '<br/>') : 'No specific topic provided.'}
                                    </p>
                                </div>

                                <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
                                    If you have any questions or need to reschedule, please contact the student directly or use the platform.
                                </p>

                                <p style="color: #65a30d; font-size: 14px; font-weight: bold; margin-bottom: 15px;">
                                    Click below to join the video session at the scheduled time
                                </p>

                                <a href="${meetingLink}" style="display: inline-block; background-color: #84cc16; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-size: 16px; font-weight: bold;">
                                    Join Video Session
                                </a>
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
                path: require('path').join(process.cwd(), 'public', 'assets', 'logo.png'),
                cid: 'tlablogo'
            }]).catch((err) => {
                console.error("Failed to send booking notification email to mentor:", err);
            });
        }

        return NextResponse.json({ success: true, data: booking });

    } catch (error) {
        console.error("Booking Error:", error);
        return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }
}
