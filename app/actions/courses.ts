'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface AdminCourseParams {
    limit?: number;
    offset?: number;
    search?: string;
    categoryFilter?: string;
    assignmentFilter?: string;
    sortOption?: string;
}

export async function getAdminCourses(params?: AdminCourseParams) {
    try {
        const {
            limit = 10,
            offset = 0,
            search = '',
            categoryFilter = 'All',
            assignmentFilter = 'All',
            sortOption = 'latest'
        } = params || {};

        const whereClause: any = {};

        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (categoryFilter !== 'All') {
            const categoryObj = await prisma.category.findUnique({ where: { id: categoryFilter } });
            const subCategories = await prisma.subCategory.findMany({ where: { categoryId: categoryFilter } });

            const categoryConditions: any[] = [
                { subCategoryId: { in: subCategories.map(s => s.id) } }
            ];
            if (categoryObj) {
                categoryConditions.push({ category: categoryObj.name });
            }

            if (whereClause.OR) {
                whereClause.AND = [
                    { OR: whereClause.OR },
                    { OR: categoryConditions }
                ];
                delete whereClause.OR;
            } else {
                whereClause.OR = categoryConditions;
            }
        }

        if (assignmentFilter === 'Assigned') {
            whereClause.enrollments = { some: {} };
        } else if (assignmentFilter === 'Not Assigned') {
            whereClause.enrollments = { none: {} };
        }

        let orderByClause: any = { createdAt: 'desc' };

        switch (sortOption) {
            case 'oldest': orderByClause = { createdAt: 'asc' }; break;
            case 'a_z': orderByClause = { title: 'asc' }; break;
            case 'z_a': orderByClause = { title: 'desc' }; break;
            case 'most_assigned': orderByClause = { enrollments: { _count: 'desc' } }; break;
            case 'least_assigned': orderByClause = { enrollments: { _count: 'asc' } }; break;
            case 'latest':
            default:
                orderByClause = { createdAt: 'desc' };
        }

        const [courses, totalCount] = await prisma.$transaction([
            prisma.course.findMany({
                where: whereClause,
                orderBy: orderByClause,
                take: limit === -1 ? undefined : limit,
                skip: offset,
                include: {
                    _count: { select: { enrollments: true, chapters: true } },
                    subCategory: { include: { category: true } }
                }
            }),
            prisma.course.count({ where: whereClause })
        ]);

        return {
            success: true,
            data: courses,
            totalCount,
            hasMore: limit !== -1 ? (offset + courses.length < totalCount) : false
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAdminCourseStats() {
    try {
        const stats = await prisma.course.findMany({
            select: {
                category: true,
                subCategoryId: true,
                subCategory: {
                    select: { categoryId: true }
                }
            }
        });
        return { success: true, data: stats };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getDashboardData(userId: string, isAdmin: boolean = false) {
    try {
        const uid = userId || "u1";
        const myCourses: any[] = [];
        const complianceDocs: any[] = [];
        const recentCourses: any[] = [];

        // 1. Fetch Recent Learning for everyone
        const progressList = await prisma.userProgress.findMany({
            where: { userId: uid },
            orderBy: { lastAccessed: 'desc' },
            take: 50,
            select: {
                lastAccessed: true,
                topic: {
                    select: {
                        chapter: {
                            select: {
                                course: {
                                    select: {
                                        id: true,
                                        title: true,
                                        description: true,
                                        thumbnail: true,
                                        category: true,
                                        isCompliance: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const seenCourses = new Set<string>();
        for (const p of progressList) {
            // @ts-ignore
            const course = p.topic?.chapter?.course;
            if (course && !seenCourses.has(course.id) && !course.isCompliance) {
                seenCourses.add(course.id);
                recentCourses.push({
                    ...course,
                    lastAccessed: p.lastAccessed
                });
            }
            if (recentCourses.length >= 3) break;
        }

        // If the user is an admin and that's all they need, return early
        if (isAdmin) {
            return { success: true, data: { myCourses, complianceDocs, recentCourses } };
        }

        // 2. Fetch all enrollments for this user (both regular and compliance)
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

        if (enrollments.length === 0) {
            return { success: true, data: { myCourses, complianceDocs, recentCourses } };
        }

        // 3. Fetch all progress for these topics
        const allCourseTopicIds = enrollments.flatMap(e =>
            e.course.chapters.flatMap(c => c.topics.map(t => t.id))
        );

        const userProgress = await prisma.userProgress.findMany({
            where: {
                userId: uid,
                topicId: { in: allCourseTopicIds }
            },
            select: {
                topicId: true,
                completed: true,
                lastAccessed: true
            }
        });

        const completedTopicIds = new Set(userProgress.filter(p => p.completed).map(p => p.topicId));

        const progressMap = new Map();
        userProgress.forEach(p => progressMap.set(p.topicId, p));

        // 4. Fetch ALL Quiz Attempts for these courses
        const courseIds = enrollments.map(e => e.course.id);
        const quizAttempts = await prisma.quizAttempt.findMany({
            where: {
                userId: uid,
                courseId: { in: courseIds }
            },
            select: {
                courseId: true,
                score: true
            }
        });

        const bestQuizScores = new Map<string, number>();
        quizAttempts.forEach(qa => {
            if (!qa.courseId) return;
            const current = bestQuizScores.get(qa.courseId) || 0;
            if (qa.score > current) {
                bestQuizScores.set(qa.courseId, qa.score);
            }
        });

        for (const e of enrollments) {
            const isCompliance = e.course.isCompliance;
            const allTopics = e.course.chapters.flatMap(c => c.topics);
            const totalTopics = allTopics.length;
            const completedCount = allTopics.filter(t => completedTopicIds.has(t.id)).length;
            const progressPct = totalTopics > 0 ? (completedCount / totalTopics) * 100 : 0;

            if (!isCompliance) {
                // Regular course
                myCourses.push({
                    ...e.course,
                    totalTopics,
                    progress: Math.round(progressPct),
                    enrolledAt: e.assignedAt,
                    assignedAt: e.assignedAt,
                    expiresAt: e.expiresAt,
                    completedAt: e.completedAt,
                    totalTime: e.totalTime,
                    lastActiveAt: e.lastActiveAt,
                    status: e.status
                });
            } else {
                // Compliance course
                let lastActiveTopicId = null;
                let maxDate = 0;

                allTopics.forEach(t => {
                    const p = progressMap.get(t.id);
                    if (p && p.lastAccessed) {
                        const time = new Date(p.lastAccessed).getTime();
                        if (time > maxDate) {
                            maxDate = time;
                            lastActiveTopicId = t.id;
                        }
                    }
                });

                let quizPassed = false;
                const courseData = e.course as any;
                if ((courseData.quizQuestionCount || 0) > 0) {
                    const bestScore = bestQuizScores.get(e.course.id) || 0;
                    if (bestScore >= (courseData.quizMinScore || 80)) {
                        quizPassed = true;
                    }
                } else {
                    quizPassed = true;
                }

                const { chapters, ...courseRest } = e.course;

                complianceDocs.push({
                    ...courseRest,
                    assignedAt: e.assignedAt,
                    completedAt: e.completedAt,
                    signedAt: e.signedAt,
                    isSigned: !!e.signedAt,
                    progress: progressPct,
                    allTopicsViewed: totalTopics > 0 && completedCount === totalTopics,
                    quizPassed,
                    lastActiveTopicId,
                    expiresAt: e.expiresAt,
                    _count: { chapters: chapters.length }
                });
            }
        }

        return { success: true, data: { myCourses, complianceDocs, recentCourses } };

    } catch (error: any) {
        console.error("getDashboardData Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getMyCourses(userId: string) {
    try {
        const uid = userId || "u1";

        // Check enrollments
        // const enrollmentCount = await prisma.enrollment.count({ where: { userId: uid } });

        // if (enrollmentCount === 0) {
        //     console.log(`[getMyCourses] User ${uid} has 0 enrollments. Auto-enrolling in active courses...`);
        //     const activeCourses = await prisma.course.findMany({ where: { isActive: true }, select: { id: true } });
        //     if (activeCourses.length > 0) {
        //         await prisma.enrollment.createMany({
        //             data: activeCourses.map(c => ({
        //                 userId: uid,
        //                 courseId: c.id,
        //                 assignedAt: new Date()
        //             }))
        //         });
        //     }
        // }

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

        // Optimize: Fetch all progress for this user in one go
        const allUserProgress = await prisma.userProgress.findMany({
            where: { userId: uid, completed: true },
            select: { topicId: true }
        });
        const completedTopicIds = new Set(allUserProgress.map(p => p.topicId));

        console.log(`[getMyCourses] User: ${uid}, Enrollments: ${enrollments.length}`);

        const courses = enrollments.map(e => {
            // Calculate Total Topics
            const totalTopics = e.course.chapters.reduce((acc, ch) => acc + ch.topics.length, 0);

            // Calculate Completed Topics in-memory
            let progress = 0;
            if (totalTopics > 0) {
                const courseTopicIds = e.course.chapters.flatMap(ch => ch.topics.map(t => t.id));
                const completedCount = courseTopicIds.filter(tid => completedTopicIds.has(tid)).length;
                progress = Math.round((completedCount / totalTopics) * 100);
            }

            return {
                ...e.course,
                totalTopics,
                progress,
                enrolledAt: e.assignedAt,
                assignedAt: e.assignedAt,
                expiresAt: e.expiresAt,
                completedAt: e.completedAt,
                totalTime: e.totalTime,
                lastActiveAt: e.lastActiveAt,
                status: e.status
            };
        });

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

        // 1. Fetch Enrollments with Course Structure (Chapters -> Topics)
        // This avoids querying topics count per course later
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

        // 2. Fetch ALL relevant UserProgress for these courses in one go
        // Get all topic IDs involved involved in these courses
        const allCourseTopicIds = enrollments.flatMap(e =>
            e.course.chapters.flatMap(c => c.topics.map(t => t.id))
        );

        // Fetch progress for these topics
        const userProgress = await prisma.userProgress.findMany({
            where: {
                userId: uid,
                topicId: { in: allCourseTopicIds }
            },
            select: {
                topicId: true,
                completed: true,
                lastAccessed: true
            }
        });

        // Create a Set of completed topic IDs for O(1) lookup
        const completedTopicIds = new Set(
            userProgress.filter(p => p.completed).map(p => p.topicId)
        );

        // Map latest access time per topic to help find "last active"
        // actually, we need to map topicId -> lastAccessed to find the latest
        const progressMap = new Map();
        userProgress.forEach(p => {
            progressMap.set(p.topicId, p);
        });

        // 3. Fetch ALL Quiz Attempts for these courses
        const courseIds = enrollments.map(e => e.course.id);
        const quizAttempts = await prisma.quizAttempt.findMany({
            where: {
                userId: uid,
                courseId: { in: courseIds }
            },
            select: {
                courseId: true,
                score: true
            }
        });

        // Map courseId -> Best Score
        const bestQuizScores = new Map<string, number>();
        quizAttempts.forEach(qa => {
            if (!qa.courseId) return;
            const current = bestQuizScores.get(qa.courseId) || 0;
            if (qa.score > current) {
                bestQuizScores.set(qa.courseId, qa.score);
            }
        });

        // 4. Process Logic In-Memory
        const complianceDocs = [];

        for (const e of enrollments) {
            if (!e.course.isCompliance) continue;

            // Calculate Totals from included data
            const allTopics = e.course.chapters.flatMap(c => c.topics);
            const totalTopics = allTopics.length;

            // Calculate Progress from fetched progress
            const completedCount = allTopics.filter(t => completedTopicIds.has(t.id)).length;

            const isSigned = !!e.signedAt;
            const progress = totalTopics > 0 ? (completedCount / totalTopics) * 100 : 0;
            const allTopicsViewed = totalTopics > 0 && completedCount === totalTopics;

            // Find Last Active Topic
            // We want the topic in this course with the most recent lastAccessed
            let lastActiveTopicId = null;
            let maxDate = 0;

            allTopics.forEach(t => {
                const p = progressMap.get(t.id);
                if (p && p.lastAccessed) {
                    const time = new Date(p.lastAccessed).getTime();
                    if (time > maxDate) {
                        maxDate = time;
                        lastActiveTopicId = t.id;
                    }
                }
            });

            // Check Quiz
            let quizPassed = false;
            const courseData = e.course as any;
            if ((courseData.quizQuestionCount || 0) > 0) {
                const bestScore = bestQuizScores.get(e.course.id) || 0;
                if (bestScore >= (courseData.quizMinScore || 80)) {
                    quizPassed = true;
                }
            } else {
                quizPassed = true;
            }

            // Remove large included data from result to keep payload light
            const { chapters, ...courseRest } = e.course;

            complianceDocs.push({
                ...courseRest,
                assignedAt: e.assignedAt,
                completedAt: e.completedAt,
                signedAt: e.signedAt, // Use the actual DB value
                isSigned,
                progress,
                allTopicsViewed,
                quizPassed,
                lastActiveTopicId,
                expiresAt: e.expiresAt,
                _count: { chapters: chapters.length } // Restore expected count
            });
        }

        console.log(`[getComplianceCourses] returning ${complianceDocs.length} docs`);
        return { success: true, data: complianceDocs };
    } catch (error: any) {
        console.error("getComplianceCourses Error:", error);
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
            select: {
                lastAccessed: true,
                topic: {
                    select: {
                        chapter: {
                            select: {
                                course: {
                                    select: {
                                        id: true,
                                        title: true,
                                        description: true,
                                        thumbnail: true,
                                        category: true,
                                        isCompliance: true,
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

export async function createAiCourse(data: any, userId: string) {
    try {
        const course = await prisma.course.create({
            data: {
                title: data.title,
                description: data.description,
                category: data.categoryName || "General",
                subCategoryId: data.subCategoryId || undefined,
                thumbnail: data.thumbnailUrl,
                isActive: data.isActive,
                isCompliance: data.isCompliance,
                documentNumber: data.documentNumber,
                quizQuestionCount: data.quizQuestionCount,
                quizMinScore: data.quizMinScore,
                authorId: userId,
                chapters: {
                    create: {
                        title: "Overview",
                        topics: {
                            create: {
                                title: "Full Content",
                                content: data.aiContent,
                                type: "text"
                            }
                        }
                    }
                }
            }
        });
        revalidatePath('/admin/upload');
        return { success: true, courseId: course.id };
    } catch (error: any) {
        console.error("Create AI Course Error:", error);
        return { success: false, error: error.message };
    }
}
