import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.userId as string;

        const body = await req.json();
        const {
            courseId,
            topicId,
            topicName,
            score,
            totalQuestions,
            timeTaken,
            quizData
        } = body;

        if (!topicName || score === undefined || !quizData) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const attempt = await prisma.quizAttempt.create({
            data: {
                userId,
                courseId,
                topicId,
                topicName,
                score,
                totalQuestions,
                timeTaken,
                quizData,
                submittedAt: new Date()
            }
        });

        return NextResponse.json({ success: true, id: attempt.id });

    } catch (error) {
        console.error('Quiz submission error:', error);
        return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 });
    }
}
