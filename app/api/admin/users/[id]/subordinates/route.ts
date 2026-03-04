import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

async function getCurrentUser(req: NextRequest) {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { id: string; email: string; role: string; companyId: string };
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser(req);
    if (!user || (user.role !== 'COMPANY_ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'HR' && user.role !== 'MANAGER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const managerId = (await params).id;

        const subordinates = await prisma.user.findMany({
            where: {
                managers: {
                    some: {
                        id: managerId
                    }
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                lastLogin: true,
                isActive: true,
                _count: {
                    select: {
                        enrollments: { where: { status: 'ACTIVE' } },
                        quizAttempts: true
                    }
                },
                enrollments: {
                    select: {
                        totalTime: true,
                        completedAt: true,
                        status: true
                    }
                },
                quizAttempts: {
                    select: {
                        score: true,
                        totalQuestions: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Process data for UI
        const data = subordinates.map(sub => {
            const totalStudyTime = sub.enrollments.reduce((acc, curr) => acc + curr.totalTime, 0); // Seconds
            const hours = Math.round(totalStudyTime / 3600 * 10) / 10;

            const completedCourses = sub.enrollments.filter(e => e.completedAt).length;

            let quizAvg = 0;
            if (sub.quizAttempts.length > 0) {
                const totalScore = sub.quizAttempts.reduce((acc, curr) => {
                    const percentage = (curr.score / curr.totalQuestions) * 100;
                    return acc + percentage;
                }, 0);
                quizAvg = Math.round(totalScore / sub.quizAttempts.length);
            }

            return {
                id: sub.id,
                name: sub.name,
                email: sub.email,
                lastLogin: sub.lastLogin,
                isActive: sub.isActive,
                allocatedContent: sub._count.enrollments, // Should capture all or just active? Using active from query
                completedContent: completedCourses,
                avgStudyHours: hours,
                quizAvgScore: quizAvg
            };
        });

        return NextResponse.json(data);

    } catch (error) {
        console.error("Subordinates API Error", error);
        return NextResponse.json({ error: 'Failed to fetch subordinates' }, { status: 500 });
    }
}
