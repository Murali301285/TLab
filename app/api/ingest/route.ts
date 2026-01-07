import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

const prisma = new PrismaClient();

// In a real app, move to lib/groq.ts
const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is missing");
    return new Groq({ apiKey });
};

async function processWithGroq(text: string, category: string, apiKey: string) {
    if (!apiKey) return { title: "Extracted Course", chapters: [] };

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are an expert educational content creator. 
Analyze the document text provided by the user about "${category}".
Extract the course title and a list of chapters with their sub-topics (3-5 items).

Return ONLY valid JSON in this format:
{
  "title": "Course Title",
  "chapters": [
    {
      "title": "Chapter 1 Title",
      "topics": ["Topic 1.1", "Topic 1.2"]
    }
  ]
}
Do not include markdown formatting like \`\`\`json. Return raw JSON only.`;

    const userPrompt = `Text content (first 25k chars):\n${text.substring(0, 25000)}`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            max_tokens: 1024,
            response_format: { type: "json_object" }
        });

        const textResponse = completion.choices[0]?.message?.content || "{}";
        return JSON.parse(textResponse);
    } catch (e) {
        console.error("AI Error", e);
        // Fallback structure
        return {
            title: "Uploaded Document",
            chapters: [{ title: "Overview", topics: ["Summary", "Key Points"] }]
        };
    }
}

export async function POST(req: NextRequest) {
    console.log("--- INGEST API CALLED (Standard FormData) ---");
    try {
        // Standard Next.js handling
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const category = formData.get('category') as string;
        const customTitle = formData.get('title') as string;
        const description = formData.get('description') as string;
        const thumbnailUrl = formData.get('thumbnailUrl') as string;

        if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

        console.log("File:", file.name, "Size:", file.size, "Type:", file.type);

        // 1. Save File to Disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Sanitize filename
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        // Ensure dir exists
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        const fileUrl = `/uploads/${fileName}`;

        // 2. Extract Text
        let text = "";

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            const data = await pdf(buffer);
            text = data.text;
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm')) {
            text = "Video content. Please generate a course structure relevant to the title provided.";
        } else {
            return NextResponse.json({ error: 'Unsupported file type: ' + file.type }, { status: 400 });
        }

        // 3. AI Process
        const apiKey = process.env.GROQ_API_KEY || "";
        const structure = await processWithGroq(text, category, apiKey);

        // 4. Save to Prisma
        const courseTitle = customTitle || structure.title || file.name.replace(/\.[^/.]+$/, "");

        const author = await prisma.user.findFirst();
        const authorId = author?.id || "u1";

        const existingCourse = await prisma.course.findFirst({
            where: { title: courseTitle, authorId }
        });

        if (existingCourse) {
            return NextResponse.json({ error: 'A course with this title already exists.' }, { status: 409 });
        }

        const newCourse = await prisma.course.create({
            data: {
                title: courseTitle,
                description: description || undefined,
                category: category || 'General',
                thumbnail: thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
                sourceText: text,
                fileUrl: fileUrl,
                authorId: authorId,
                chapters: {
                    create: structure.chapters?.map((ch: any) => ({
                        title: ch.title,
                        topics: {
                            create: ch.topics?.map((t: string) => ({
                                title: t,
                                type: 'text',
                                content: ""
                            }))
                        }
                    }))
                }
            },
            include: {
                chapters: { include: { topics: true } }
            }
        });

        console.log("Course Created:", newCourse.id);

        return NextResponse.json({
            ...newCourse,
            fullText: text
        });

    } catch (error: any) {
        console.error('Ingest error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
