'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function removeCourseAllocation(userId: string, courseId: string) {
    try {
        // 1. Delete Enrollment
        await prisma.enrollment.deleteMany({
            where: {
                userId: userId,
                courseId: courseId
            }
        });

        // 2. Delete Quiz Attempts for this course
        await prisma.quizAttempt.deleteMany({
            where: {
                userId: userId,
                courseId: courseId
            }
        });

        // 3. Delete Topic Progress for this course (Optional but recommended for clean slate)
        // We need to find topics belonging to this course first
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                chapters: {
                    include: {
                        topics: { select: { id: true } }
                    }
                }
            }
        });

        if (course) {
            const topicIds = course.chapters.flatMap(c => c.topics.map(t => t.id));
            if (topicIds.length > 0) {
                await prisma.userProgress.deleteMany({
                    where: {
                        userId: userId,
                        topicId: { in: topicIds }
                    }
                });
            }
        }

        revalidatePath('/admin/users');
        revalidatePath('/learning');
        revalidatePath('/dashboard');

        return { success: true };
    } catch (error: any) {
        console.error("Remove Course Error:", error);
        return { success: false, error: error.message };
    }
}

export async function toggleCourseBlock(userId: string, courseId: string, newStatus: 'ACTIVE' | 'BLOCKED') {
    try {
        await prisma.enrollment.updateMany({
            where: {
                userId: userId,
                courseId: courseId
            },
            data: {
                status: newStatus
            }
        });

        revalidatePath('/admin/users');
        revalidatePath('/learning');
        revalidatePath('/dashboard');

        return { success: true };
    } catch (error: any) {
        console.error("Toggle Block Error:", error);
        return { success: false, error: error.message };
    }
}
