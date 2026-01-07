
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const { userId, topicId, completed } = await req.json();

        if (!userId || !topicId) {
            return NextResponse.json({ error: 'Missing userId or topicId' }, { status: 400 });
        }

        const progress = await prisma.userProgress.upsert({
            where: {
                userId_topicId: { userId, topicId }
            },
            update: {
                completed,
                lastAccessed: new Date()
            },
            create: {
                userId,
                topicId,
                completed,
                lastAccessed: new Date()
            }
        });

        return NextResponse.json(progress);
    } catch (error) {
        console.error("Progress Update Error", error);
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }
}
