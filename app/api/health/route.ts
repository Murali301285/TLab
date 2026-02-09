import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log("[Health Check] Starting...");

    // Check Env
    if (!process.env.DATABASE_URL) {
        console.error("[Health Check] DATABASE_URL is missing!");
        return NextResponse.json({ status: 'error', message: 'DATABASE_URL is missing' }, { status: 500 });
    }

    try {
        const prisma = new PrismaClient();
        await prisma.$connect();
        const count = await prisma.user.count();
        await prisma.$disconnect();

        return NextResponse.json({
            status: 'ok',
            database: 'connected',
            userCount: count,
            env: {
                port: process.env.PORT,
                node_env: process.env.NODE_ENV
            }
        });
    } catch (e: any) {
        console.error("[Health Check] Database Error:", e);
        return NextResponse.json({
            status: 'error',
            message: e.message,
            stack: e.stack
        }, { status: 500 });
    }
}
