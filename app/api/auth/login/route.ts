
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';

// const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            },
            include: {
                company: true
            }
        });
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        if (user.isActive === false) {
            return NextResponse.json({ error: 'Login is blocked. Contact Admin.' }, { status: 403 });
        }

        // Check Temp User Validity
        if (user.isTempUser && user.validity) {
            const now = new Date();
            const validityDate = new Date(user.validity);
            // set validity to end of that day to be generous or exact time? 
            // Usually validity is a date, so let's assume end of that day.
            // But if it is stored as DateTime, it's exact.
            // Let's stick to strict comparison for now.
            if (now > validityDate) {
                return NextResponse.json({ error: 'Login validity expired. Contact Admin.' }, { status: 403 });
            }
        }

        // Check Company Validity (SaaS Logic)
        if (user.companyId) {
            // Import dynamically or at top if possible. Using dynamic for cleaner diff here or top level.
            // Let's assume standard import at top.
            // Actually, I can just check the fields directly here since we included company relation.
            // But using the utility is cleaner for future consistency. 
            // However, the utility fetches company again. 
            // For now, let's keep the direct check for performance but ENHANCE it with the new fields.

            if (!user.company.isActive) {
                return NextResponse.json({ error: 'Company account is inactive. Contact Support.' }, { status: 403 });
            }

            if (user.company.licenseExpiresAt && new Date() > new Date(user.company.licenseExpiresAt)) {
                return NextResponse.json({ error: 'Company license has expired. Please renew.' }, { status: 403 });
            }
        }

        // Update Last Login (Use Raw SQL to bypass stale Prisma Client types if generation failed)
        try {
            await prisma.$executeRaw`UPDATE "User" SET "lastLogin" = ${new Date()} WHERE "id" = ${user.id}`;
        } catch (e) {
            console.error("Failed to update lastLogin:", e);
        }

        // Generate JWT
        const token = await new jose.SignJWT({
            id: user.id,
            email: user.email,
            role: user.role,
            companyId: user.companyId
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('1d')
            .sign(JWT_SECRET);

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                image: user.image,
                companyId: user.companyId
            }
        });

        // Set Cookie
        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: false, // Changed to false to allow HTTP (IP Address Access)
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 // 24 hours
        });

        return response;

    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
