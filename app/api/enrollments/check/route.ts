
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
        return NextResponse.json({ error: 'Course ID missing' }, { status: 400 });
    }

    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.userId as string;

        const enrollment = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId
                }
            }
        });

        if (!enrollment) {
            return NextResponse.json({ enrolled: false });
        }

        // Calculate if valid
        const now = new Date();
        const isValid = !enrollment.expiresAt || new Date(enrollment.expiresAt) > now;

        // Calculate days left
        let daysLeft = null;
        if (enrollment.expiresAt) {
            const diff = new Date(enrollment.expiresAt).getTime() - now.getTime();
            daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
        }

        // Calculate Progress (Robustness for Legacy Data)
        const totalTopics = await prisma.topic.count({
            where: { chapter: { courseId: courseId } } // Use courseId from params
        });

        const completedTopics = await prisma.userProgress.findMany({
            where: {
                userId,
                topic: { chapter: { courseId: courseId } },
                completed: true
            },
            select: { topicId: true }
        });

        const completedTopicsCount = completedTopics.length;
        const progress = totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : 0;

        return NextResponse.json({
            enrolled: true,
            isValid,
            daysLeft,
            expiresAt: enrollment.expiresAt,
            completedAt: enrollment.completedAt,
            quizConfig: enrollment.quizConfig,
            progress,
            completedTopicIds: completedTopics.map(p => p.topicId)
        });

    } catch (error) {
        console.error("Enrollment Check Error", error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
