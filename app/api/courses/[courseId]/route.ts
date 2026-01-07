
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    const courseId = (await params).courseId;

    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                chapters: {
                    include: {
                        topics: {
                            orderBy: { id: 'asc' } // Or by a specific order field if exists
                        }
                    },
                    orderBy: { id: 'asc' }
                }
            }
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        return NextResponse.json(course);

    } catch (error) {
        console.error("Fetch Course Error", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
