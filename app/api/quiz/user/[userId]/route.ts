import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key');

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const { role } = payload;

        // Only Admin or Manager can view other users' quizzes
        if (role !== 'admin' && role !== 'manager') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { userId } = await params;

        const quizzes = await prisma.quizAttempt.findMany({
            where: {
                userId: userId
            },
            orderBy: {
                submittedAt: 'desc'
            }
        });

        return NextResponse.json(quizzes);

    } catch (error) {
        console.error('Fetch user quizzes error:', error);
        return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }
}
