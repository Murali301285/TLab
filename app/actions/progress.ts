'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

// ... existing code ...

export async function updateTopicProgress(userId: string, topicId: string, timeSpent: number = 0, completed: boolean = true) {
    try {
        const progress = await prisma.userProgress.upsert({
            where: {
                userId_topicId: { userId, topicId }
            },
            update: {
                completed,
                lastAccessed: new Date(),
                timeSpent: { increment: timeSpent },
                completedAt: completed ? new Date() : undefined
            },
            create: {
                userId,
                topicId,
                completed,
                timeSpent,
                lastAccessed: new Date(),
                completedAt: completed ? new Date() : undefined
            }
        });

        // Update Enrollment Total Time
        // Find course for this topic
        const topic = await prisma.topic.findUnique({
            where: { id: topicId },
            include: { chapter: { include: { course: true } } }
        });

        if (topic) {
            const courseId = topic.chapter.courseId;
            // Check if enrollment exists before update
            const enrollment = await prisma.enrollment.findUnique({
                where: { userId_courseId: { userId, courseId } }
            });

            if (enrollment) {
                await prisma.enrollment.update({
                    where: { userId_courseId: { userId, courseId } },
                    data: {
                        totalTime: { increment: timeSpent },
                        lastActiveAt: new Date()
                    }
                });
            }
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function completeCourse(userId: string, courseId: string) {
    try {
        const completedAt = new Date();
        await prisma.enrollment.update({
            where: { userId_courseId: { userId, courseId } },
            data: {
                completedAt,
                lastActiveAt: completedAt,
                hasCertificate: true,
                certName: "Completion Certificate", // Placeholder
            }
        });

        revalidatePath('/dashboard');
        revalidatePath('/learning');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
