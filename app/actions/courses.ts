'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function getAdminCourses() {
    try {
        const courses = await prisma.course.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { enrollments: true, chapters: true } },
                subCategory: { include: { category: true } }
            }
        });
        return { success: true, data: courses };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getMyCourses(userId: string) {
    try {
        // If userId is missing, maybe default to "u1" for demo?
        const uid = userId || "u1";

        const enrollments = await prisma.enrollment.findMany({
            where: { userId: uid },
            include: {
                course: {
                    include: {
                        _count: { select: { chapters: true } }
                    }
                }
            }
        });

        const courses = enrollments.map(e => ({
            ...e.course,
            assignedAt: e.assignedAt,
            expiresAt: e.expiresAt
        }));

        return { success: true, data: courses };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getRecentLearning(userId: string) {
    try {
        const uid = userId || "u1";

        // Fetch recent progress traversing up to Course
        const progress = await prisma.userProgress.findMany({
            where: { userId: uid },
            orderBy: { lastAccessed: 'desc' },
            take: 50,
            include: {
                topic: {
                    include: {
                        chapter: {
                            include: {
                                course: {
                                    include: {
                                        _count: { select: { chapters: true } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Extract Courses and Deduplicate
        const seenCourses = new Set<string>();
        const uniqueCourses: any[] = [];

        for (const p of progress) {
            // @ts-ignore - TS might complain about nested optional relations if schema types aren't fully regenerated
            const course = p.topic?.chapter?.course;
            if (course && !seenCourses.has(course.id)) {
                seenCourses.add(course.id);
                uniqueCourses.push({
                    ...course,
                    lastAccessed: p.lastAccessed
                });
            }
            if (uniqueCourses.length >= 3) break;
        }

        return { success: true, data: uniqueCourses };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleCourseStatus(courseId: string, isActive: boolean) {
    try {
        await prisma.course.update({
            where: { id: courseId },
            data: { isActive }
        });
        revalidatePath('/admin/upload');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteCourse(courseId: string) {
    try {
        await prisma.course.delete({
            where: { id: courseId }
        });
        revalidatePath('/admin/upload');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateCourse(courseId: string, data: any) {
    try {
        await prisma.course.update({
            where: { id: courseId },
            data: {
                title: data.title,
                description: data.description,
                // Handle legacy category string vs relation
                // For now, if we pass categoryId/subCategoryId, handle that
                category: data.categoryName || "General",
                subCategoryId: data.subCategoryId,
                thumbnail: data.thumbnailUrl,
                isActive: data.isActive
            }
        });
        revalidatePath('/admin/upload');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            include: {
                subCategories: {
                    where: { isActive: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, data: categories };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getCourseById(courseId: string) {
    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                chapters: {
                    include: {
                        topics: true
                    }
                },
                author: true,
                subCategory: {
                    include: { category: true }
                }
            }
        });
        if (!course) return { success: false, error: "Course not found" };
        return { success: true, data: course };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
