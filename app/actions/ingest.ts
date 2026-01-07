'use server';

import { Groq } from 'groq-sdk';
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { PrismaClient } from '@prisma/client';
import { createWriteStream, appendFileSync, renameSync } from 'fs';
import { readFile, mkdir, writeFile, rename } from 'fs/promises';
import { Readable } from 'stream';
import path from 'path';

const prisma = new PrismaClient();

// Configuration for Server Action
// Configuration for Server Action (Handled by platform/config)
// export const maxDuration = 300; // Removed to fix build error

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

// Shared processing logic
async function processFile(filePath: string, fileName: string, category: string, customTitle: string, description: string | null, thumbnailUrl: string | null, authorId: string, subCategoryId?: string) {
    const fileUrl = `/uploads/${path.basename(filePath)}`;
    let text = "";

    // Read file for extraction
    const buffer = await readFile(filePath);

    if (fileName.endsWith('.pdf')) {
        const data = await pdf(buffer);
        text = data.text;
    } else if (fileName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
    } else if (fileName.match(/\.(mp4|webm|mov)$/)) {
        text = "Video content. Please generate a course structure relevant to the title.";
    } else {
        throw new Error(`Unsupported file type: ${fileName}`);
    }

    // AI Process
    const apiKey = process.env.GROQ_API_KEY || "";
    const structure = await processWithGroq(text, category, apiKey);

    const courseTitle = customTitle || structure.title || fileName.replace(/\.[^/.]+$/, "");

    const existingCourse = await prisma.course.findFirst({
        where: { title: courseTitle, authorId }
    });

    if (existingCourse) {
        throw new Error('A course with this title already exists.');
    }

    const newCourse = await prisma.course.create({
        data: {
            title: courseTitle,
            description: description || undefined,
            category: category || 'General',
            subCategoryId: subCategoryId || null,
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

    return {
        id: newCourse.id,
        title: newCourse.title,
        chapters: structure.chapters // Return for UI preview
    };
}

// 1. Upload Chunk
export async function uploadChunk(formData: FormData) {
    try {
        const chunk = formData.get('chunk') as File;
        const fileId = formData.get('fileId') as string;
        // const index = parseInt(formData.get('index') as string);

        if (!chunk || !fileId) throw new Error("Missing chunk data");

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'temp');
        await mkdir(uploadDir, { recursive: true });
        const tempFilePath = path.join(uploadDir, fileId);

        const bytes = await chunk.arrayBuffer();
        const buffer = Buffer.from(bytes);

        appendFileSync(tempFilePath, buffer);

        return { success: true };
    } catch (e: any) {
        console.error("Chunk upload error:", e);
        return { success: false, error: e.message };
    }
}

// 2. Finalize
export async function finalizeUpload(formData: FormData) {
    try {
        const fileId = formData.get('fileId') as string;
        const fileName = formData.get('fileName') as string;
        const category = formData.get('category') as string;
        const subCategoryId = formData.get('subCategoryId') as string;
        const customTitle = formData.get('title') as string;
        const description = formData.get('description') as string;
        const thumbnailUrl = formData.get('thumbnailUrl') as string;

        const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp');
        const tempFilePath = path.join(tempDir, fileId);

        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const finalFileName = `${Date.now()}-${safeName}`;
        const finalFilePath = path.join(uploadDir, finalFileName);

        await rename(tempFilePath, finalFilePath);

        // Process
        const author = await prisma.user.findFirst();
        const authorId = author?.id || "u1";

        const data = await processFile(finalFilePath, finalFileName, category, customTitle, description, thumbnailUrl, authorId, subCategoryId);

        return { success: true, data };
    } catch (e: any) {
        console.error("Finalize error:", e);
        return { success: false, error: e.message };
    }
}

// Original (legacy/small file) support
export async function ingestContent(formData: FormData) {
    // ... kept for backward compatibility if needed, but we will mostly use chunking now
    // Reuse logic
    try {
        const file = formData.get('file') as File;
        if (!file) throw new Error("No file");

        const category = formData.get('category') as string;
        const customTitle = formData.get('title') as string;
        const description = formData.get('description') as string;
        const thumbnailUrl = formData.get('thumbnailUrl') as string;

        console.log("Ingesting file (Direct):", file.name);

        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadDir, fileName);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        const author = await prisma.user.findFirst();
        const authorId = author?.id || "u1";

        const data = await processFile(filePath, fileName, category, customTitle, description, thumbnailUrl, authorId);

        return { success: true, data };
    } catch (error: any) {
        console.error('Ingest error:', error);
        return { success: false, error: error.message };
    }
}
