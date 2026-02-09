'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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

        // Check if user has ANY enrollments (Lazy Auto-Enroll for existing users)
        const enrollmentCount = await prisma.enrollment.count({ where: { userId: uid } });

        if (enrollmentCount === 0) {
            console.log(`[getMyCourses] User ${uid} has 0 enrollments. Auto-enrolling in active courses...`);
            const activeCourses = await prisma.course.findMany({ where: { isActive: true }, select: { id: true } });
            if (activeCourses.length > 0) {
                await prisma.enrollment.createMany({
                    data: activeCourses.map(c => ({
                        userId: uid,
                        courseId: c.id,
                        assignedAt: new Date()
                    }))
                });
            }
        }

        const enrollments = await prisma.enrollment.findMany({
            where: { userId: uid },
            include: {
                course: {
                    include: {
                        chapters: {
                            include: {
                                topics: { select: { id: true } }
                            }
                        }
                    }
                }
            }
        });

        console.log(`[getMyCourses] User: ${uid}, Enrollments: ${enrollments.length}`);

        const courses = await Promise.all(enrollments.map(async (e) => {
            // Calculate Total Topics
            const totalTopics = e.course.chapters.reduce((acc, ch) => acc + ch.topics.length, 0);

            // Calculate Completed Topics
            let progress = 0;
            if (totalTopics > 0) {
                const topicIds = e.course.chapters.flatMap(ch => ch.topics.map(t => t.id));
                const completedCount = await prisma.userProgress.count({
                    where: {
                        userId: uid,
                        topicId: { in: topicIds },
                        completed: true
                    }
                });
                progress = Math.round((completedCount / totalTopics) * 100);
            }

            return {
                ...e.course,
                totalTopics,
                progress, // Now dynamically calculated
                enrolledAt: e.assignedAt,
                assignedAt: e.assignedAt,
                expiresAt: e.expiresAt,
                completedAt: e.completedAt,
                totalTime: e.totalTime,
                lastActiveAt: e.lastActiveAt,
                status: e.status
            };
        }));

        const finalCourses = courses.filter(c => !c.isCompliance);

        console.log(`[getMyCourses] Returning: ${finalCourses.length}`);

        return { success: true, data: finalCourses };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ... existing imports ...

export async function signCourse(courseId: string, userId: string) {
    try {
        const uid = userId;

        // Calculate validity date if applicable (e.g. 1 year from now)
        const completedAt = new Date();
        const signedAt = new Date();

        // Find existing enrollment
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: { userId: uid, courseId }
            }
        });

        let expiresAt = null;
        if (enrollment?.validityValue && enrollment?.validityUnit) {
            const val = enrollment.validityValue;
            const unit = enrollment.validityUnit;
            const date = new Date();

            if (unit === 'DAYS') date.setDate(date.getDate() + val);
            if (unit === 'MONTHS') date.setMonth(date.getMonth() + val);
            if (unit === 'YEARS') date.setFullYear(date.getFullYear() + val);

            expiresAt = date;
        }

        await prisma.enrollment.update({
            where: {
                userId_courseId: { userId: uid, courseId }
            },
            data: {
                completedAt,
                signedAt,
                expiresAt
            }
        });

        revalidatePath('/compliance');
        revalidatePath(`/compliance/${courseId}`);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getComplianceCourses(userId: string) {
    try {
        const uid = userId || "u1";

        // Check if user has ANY enrollments (Lazy Auto-Enroll for existing users)
        const enrollmentCount = await prisma.enrollment.count({ where: { userId: uid } });

        if (enrollmentCount === 0) {
            console.log(`[getComplianceCourses] User ${uid} has 0 enrollments. Auto-enrolling in active courses...`);
            const activeCourses = await prisma.course.findMany({ where: { isActive: true }, select: { id: true } });
            if (activeCourses.length > 0) {
                await prisma.enrollment.createMany({
                    data: activeCourses.map(c => ({
                        userId: uid,
                        courseId: c.id,
                        assignedAt: new Date()
                    }))
                });
            }
        }

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

        console.log(`[getComplianceCourses] User: ${uid}, Raw Enrollments: ${enrollments.length}`);

        // Filter for compliance only and calculate progress
        const complianceDocs = [];

        for (const e of enrollments) {
            if (!e.course.isCompliance) continue;

            const totalTopics = await prisma.topic.count({
                where: { chapter: { courseId: e.course.id } }
            });

            const completedTopics = await prisma.userProgress.count({
                where: {
                    userId: uid,
                    topic: { chapter: { courseId: e.course.id } },
                    completed: true
                }
            });

            // Is signed if signedAt is present OR (legacy fallback) all topics done
            // Moving forward, we rely on signedAt for the explicit signature
            // But we still track progress for the "Read All" enforcement
            const isSigned = !!e.signedAt;
            const progress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
            const allTopicsViewed = totalTopics > 0 && completedTopics === totalTopics;

            const lastProgress = await prisma.userProgress.findFirst({
                where: {
                    userId: uid,
                    topic: { chapter: { courseId: e.course.id } }
                },
                orderBy: { lastAccessed: 'desc' },
                select: { topicId: true }
            });

            // Check if Quiz Passed
            let quizPassed = false;
            const courseData = e.course as any;
            if ((courseData.quizQuestionCount || 0) > 0) {
                const bestAttempt = await prisma.quizAttempt.findFirst({
                    where: {
                        userId: uid,
                        courseId: e.course.id,
                        score: { gte: courseData.quizMinScore || 80 }
                    }
                });
                if (bestAttempt) quizPassed = true;
            } else {
                quizPassed = true; // No quiz needed
            }

            complianceDocs.push({
                ...e.course,
                assignedAt: e.assignedAt,
                completedAt: e.completedAt,
                signedAt: e.signedAt,
                isSigned,
                progress,
                allTopicsViewed,
                quizPassed,
                lastActiveTopicId: lastProgress?.topicId || null,
                expiresAt: e.expiresAt
            });
        }

        return { success: true, data: complianceDocs };
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
            if (course && !seenCourses.has(course.id) && !course.isCompliance) { // Filter compliance docs
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
                isActive: data.isActive,
                isCompliance: data.isCompliance,
                documentNumber: data.documentNumber,
                quizQuestionCount: data.quizQuestionCount,
                quizMinScore: data.quizMinScore
            } as any
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

export async function saveQuizAttempt(
    userId: string,
    courseId: string,
    result: { score: number, totalQuestions: number, timeTaken: number, quizData: any }
) {
    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId }
        });

        if (!course) throw new Error("Course not found");

        const attempt = await prisma.quizAttempt.create({
            data: {
                userId,
                courseId,
                score: result.score,
                totalQuestions: result.totalQuestions,
                timeTaken: result.timeTaken,
                quizData: result.quizData,
                topicName: "Final Compliance Assessment"
            }
        });

        const passed = result.score >= (course.quizMinScore || 80);

        return { success: true, passed, minScore: course.quizMinScore || 80, attemptId: attempt.id };
    } catch (error: any) {
        console.error("Save Quiz Attempt Error:", error);
        return { success: false, error: error.message };
    }
}
