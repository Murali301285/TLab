import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mail';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Return success even if user not found to prevent enumeration
            return NextResponse.json({ success: true, message: 'If an account exists with this email, you will receive a password reset link.' });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        // delete existing tokens for this user
        await prisma.passwordResetToken.deleteMany({
            where: { email },
        });

        // Save token
        await prisma.passwordResetToken.create({
            data: {
                email,
                token,
                expires,
            },
        });

        // Send email
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

        await sendEmail(
            email,
            'Reset Your Password - 3Vidya',
            `
            <h1>Password Reset Request</h1>
            <p>You requested a password reset for your 3Vidya account.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
            `
        );

        return NextResponse.json({ success: true, message: 'If an account exists with this email, you will receive a password reset link.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
