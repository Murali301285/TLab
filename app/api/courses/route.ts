
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const courses = await prisma.course.findMany({
            include: {
                chapters: {
                    include: {
                        topics: true
                    }
                },
                author: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(courses);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, description, category, thumbnail, authorId, chapters } = body;

        const newCourse = await prisma.course.create({
            data: {
                title,
                description,
                category,
                thumbnail,
                authorId,
                chapters: {
                    create: chapters.map((ch: any) => ({
                        title: ch.title,
                        topics: {
                            create: ch.topics.map((t: any) => ({
                                title: t.title,
                                content: JSON.stringify(t.content) || "",
                                type: t.type || 'text'
                            }))
                        }
                    }))
                }
            }
        });

        return NextResponse.json(newCourse);
    } catch (error) {
        console.error("Create Course Error", error);
        return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
    }
}
