import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[API] /api/debug/db-check hit');

        // 1. Check Env Vars availability (masked)
        const dbUrl = process.env.DATABASE_URL;
        const dbUrlParams = dbUrl ? 'Present' : 'Missing';

        console.log(`[API] DATABASE_URL status: ${dbUrlParams}`);

        // 2. Test Simple Query
        const start = Date.now();
        const userCount = await prisma.user.count();
        const coursesCount = await prisma.course.count();
        const duration = Date.now() - start;

        return NextResponse.json({
            success: true,
            status: 'Connected',
            duration: `${duration}ms`,
            counts: {
                users: userCount,
                courses: coursesCount
            },
            envCheck: {
                DATABASE_URL: dbUrlParams,
                NODE_ENV: process.env.NODE_ENV
            }
        });

    } catch (error: any) {
        console.error('[API] DB Check Failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            envCheck: {
                DATABASE_URL: process.env.DATABASE_URL ? 'Present' : 'Missing',
            }
        }, { status: 500 });
    }
}
