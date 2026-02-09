
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

// const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ user: null }, { status: 200 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        console.log("Debug: /api/auth/me payload:", payload);

        // Fetch fresh user data from DB
        const userId = (payload.id || payload.userId) as string;
        console.log("Debug: /api/auth/me fetching for User ID:", userId);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, image: true, department: true }
        });
        console.log("Debug: /api/auth/me fetched user:", user);

        if (!user) {
            console.log("Debug: User not found in DB for ID:", payload.userId);
            return NextResponse.json({ user: null, error: `User not found for ID: ${payload.userId}` }, { status: 200 });
        }

        return NextResponse.json({ user });

    } catch (error: any) {
        console.error("Debug: /api/auth/me error:", error);
        // Token invalid/expired
        return NextResponse.json({ user: null, error: `Auth Error: ${error.message}` }, { status: 200 });
    }
}
