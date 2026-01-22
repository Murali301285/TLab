import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.userId as string;

        // Parse query params for filtering
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit') || '50');

        const quizzes = await prisma.quizAttempt.findMany({
            where: {
                userId,
                topicName: {
                    contains: search,
                    mode: 'insensitive'
                }
            },
            orderBy: {
                submittedAt: 'desc'
            },
            take: limit,
            include: {
                topic: {
                    select: {
                        chapterId: true
                    }
                }
            }
        });

        return NextResponse.json(quizzes);

    } catch (error) {
        console.error('Fetch my quizzes error:', error);
        return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }
}
