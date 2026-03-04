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

import { getGroqKeyForUser } from '@/lib/ai-config';

// ... (imports remain)

// Removed unused getGroqClient

async function processWithGroq(text: string, category: string, apiKey: string) {
    if (!apiKey) return { title: "Extracted Course", chapters: [] };

    const groq = new Groq({ apiKey });
    // ... (rest of processWithGroq remains same)
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

        // Fetch User and API Key
        const { apiKey, userId } = await getGroqKeyForUser(req);

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
            text = data.text.replace(/\x00/g, '');
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm')) {
            text = "Video content. Please generate a course structure relevant to the title provided.";
        } else {
            return NextResponse.json({ error: 'Unsupported file type: ' + file.type }, { status: 400 });
        }

        // 3. AI Process or Compliance Extraction
        // const apiKey = process.env.GROQ_API_KEY || ""; // REPLACED
        const isCompliance = formData.get('isCompliance') === 'true';
        let structure: any = {};

        if (isCompliance && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
            // Compliance Mode: Extract Page-by-Page
            console.log("Processing Compliance Document (Page-wise)...");
            const pages: string[] = [];

            const render_page = async (pageData: any) => {
                const textContent = await pageData.getTextContent();
                let lastY, text = '';
                for (let item of textContent.items) {
                    if (lastY == item.transform[5] || !lastY) {
                        text += item.str;
                    } else {
                        text += '\n' + item.str;
                    }
                    lastY = item.transform[5];
                }
                const cleanText = text.replace(/\x00/g, '').replace(/\s+/g, ' ').trim();
                // Store page text at correct index (1-based usually in UI, but 0-based array)
                pages[pageData.pageIndex] = cleanText;
                return cleanText;
            };

            await pdf(buffer, { pagerender: render_page });

            // Structure for Prisma
            structure = {
                title: customTitle || file.name.replace(/\.[^/.]+$/, ""),
                chapters: [
                    {
                        title: "Document Content",
                        topics: pages.map((pageText, idx) => ({
                            title: `Page ${idx + 1}`,
                            content: pageText // Pre-fill content!
                        }))
                    }
                ]
            };
        } else {
            // Standard AI Mode
            structure = await processWithGroq(text, category, apiKey || "");
        }

        // 4. Save to Prisma
        const courseTitle = customTitle || structure.title || file.name.replace(/\.[^/.]+$/, "");

        const authorId = userId || (await prisma.user.findFirst())?.id || "u1";

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
                isCompliance: isCompliance, // Persist compliance status
                documentNumber: formData.get('documentNumber') as string || undefined,
                chapters: {
                    create: structure.chapters?.map((ch: any) => ({
                        title: ch.title,
                        topics: {
                            create: ch.topics?.map((t: any) => {
                                // Handle both string (AI) and object (Compliance) topic formats
                                const isObj = typeof t === 'object';
                                return {
                                    title: isObj ? t.title : t,
                                    type: 'text',
                                    content: isObj ? JSON.stringify({ text: t.content }) : "" // Wrap text in JSON structure as compatible with UI expectations
                                };
                            })
                        }
                    }))
                }
            },
            include: {
                chapters: { include: { topics: true } }
            }
        });

        // AUTO-ENROLL AUTHOR (So it shows up in dashboard immediately)
        try {
            await prisma.enrollment.create({
                data: {
                    userId: authorId,
                    courseId: newCourse.id,
                    assignedAt: new Date()
                }
            });
            console.log("Auto-enrolled author:", authorId);
        } catch (e) {
            console.warn("Auto-enrollment failed or already exists", e);
        }

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
