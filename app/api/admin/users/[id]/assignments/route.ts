import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

async function getCurrentUser(req: NextRequest) {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { id: string; role: string };
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const currentUser = await getCurrentUser(req);
    // Allow Admins, Managers to view assignments
    if (!currentUser || !['COMPANY_ADMIN', 'SUPER_ADMIN', 'HR', 'MANAGER', 'CONTENT_MANAGER'].includes(currentUser.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let targetUserId = "";

    try {
        targetUserId = (await params).id;

        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId: targetUserId,
                status: 'ACTIVE'
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        type: true,
                        isCompliance: true,
                        thumbnail: true,
                        _count: { select: { chapters: true } }
                    }
                }
            },
            orderBy: { assignedAt: 'desc' }
        });

        const quizAttempts = await prisma.quizAttempt.findMany({
            where: { userId: targetUserId },
            include: {
                course: { select: { title: true, quizMinScore: true } }
            },
            orderBy: { submittedAt: 'desc' }, // Fixed: createdAt -> submittedAt
            take: 20
        });

        // Map to simplified format
        const assignments = enrollments.map(e => {
            let type = 'COURSE';
            if (e.course.isCompliance) type = 'POLICY';
            else if (e.course.type === 'LIBRARY') type = 'LIBRARY';

            return {
                id: e.course.id,
                title: e.course.title,
                description: e.course.description,
                thumbnail: e.course.thumbnail,
                type,
                assignedAt: e.assignedAt,
                lastAccessed: e.lastActiveAt,
                moduleCount: e.course._count.chapters,
                status: e.status,
                progress: 0 // e.completedAt ? 100 : 0
            };
        });

        const history = quizAttempts.map(q => ({
            id: q.id,
            courseName: q.course?.title || q.topicName || "Unknown Course", // Handle null course
            score: q.score,
            totalQuestions: q.totalQuestions || 0,
            passed: q.score >= (q.course?.quizMinScore || 80), // Handle null course
            date: q.submittedAt // Fixed: createdAt -> submittedAt
        }));

        return NextResponse.json({ assignments, quizHistory: history });

    } catch (error: any) {
        console.error("Assignments API Error Detailed:", {
            message: error.message,
            stack: error.stack,
            userId: targetUserId
        });
        return NextResponse.json({ error: 'Failed to fetch assignments', details: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const currentUser = await getCurrentUser(req);
    // Allow Admins, Managers to delete assignments
    if (!currentUser || !['COMPANY_ADMIN', 'SUPER_ADMIN', 'HR', 'MANAGER', 'CONTENT_MANAGER'].includes(currentUser.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = (await params).id;
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get('courseId');

        if (!courseId) {
            return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
        }

        // Delete enrollment
        await prisma.enrollment.deleteMany({
            where: {
                userId: userId,
                courseId: courseId
            }
        });

        // Optionally delete quiz attempts if needed, but usually we keep history.
        // For "Unassign", deleting enrollment is sufficient to revoke access.

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Delete Assignment Error:", error);
        return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }
}
