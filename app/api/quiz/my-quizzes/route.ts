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
        const type = searchParams.get('type'); // 'compliance' or 'quiz' (default: all)
        const search = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit') || '50');

        const whereCondition: any = {
            userId,
            topicName: {
                contains: search,
                mode: 'insensitive'
            }
        };

        if (type === 'compliance') {
            whereCondition.course = { isCompliance: true };
        } else if (type === 'quiz') {
            whereCondition.course = { isCompliance: false };
        }

        const quizzes = await prisma.quizAttempt.findMany({
            where: whereCondition,
            orderBy: {
                submittedAt: 'desc'
            },
            take: limit,
            include: {
                topic: {
                    select: {
                        chapterId: true
                    }
                },
                course: {
                    select: {
                        title: true,
                        isCompliance: true
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
