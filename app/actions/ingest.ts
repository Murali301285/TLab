'use server';

import { Groq } from 'groq-sdk';
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createWriteStream, appendFileSync, renameSync } from 'fs';
import { readFile, mkdir, writeFile, rename } from 'fs/promises';
import { Readable } from 'stream';
import path from 'path';

// const prisma = new PrismaClient();

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
async function processFile(filePath: string, fileName: string, category: string, customTitle: string, description: string | null, thumbnailUrl: string | null, authorId: string, subCategoryId?: string, isCompliance: boolean = false) {
    const fileUrl = `/uploads/${path.basename(filePath)}`;
    let text = "";
    let chapters: any[] = [];

    // Read file for extraction
    const buffer = await readFile(filePath);

    if (fileName.endsWith('.pdf')) {
        if (isCompliance) {
            // COMPLIANCE MODE: Page-by-Page Extraction
            const options = {
                pagerender: function (pageData: any) {
                    const render_options = {
                        normalizeWhitespace: false,
                        disableCombineTextItems: false
                    }
                    return pageData.getTextContent(render_options)
                        .then(function (textContent: any) {
                            let lastY, text = '';
                            for (let item of textContent.items) {
                                if (lastY == item.transform[5] || !lastY) {
                                    text += item.str;
                                } else {
                                    text += '\n' + item.str;
                                }
                                lastY = item.transform[5];
                            }
                            // Inject Delimiter
                            return text + "\n|||PAGE_BREAK|||\n";
                        });
                }
            }
            const data = await pdf(buffer, options);
            const rawPages = data.text.split('|||PAGE_BREAK|||');

            // Create Chapters from Pages (Filter empty last split)
            chapters = rawPages
                .filter((p: string) => p.trim().length > 0)
                .map((pageText: string, index: number) => ({
                    title: `Page ${index + 1}`,
                    topics: [{ title: 'Content', content: pageText.replace(/\x00/g, '').trim() }] // Pre-filled content
                }));

            text = data.text.replace(/\x00/g, '').replace(/\|\|\|PAGE_BREAK\|\|\|/g, '\n\n'); // Clean text for sourceText
        } else {
            // STANDARD MODE: Full Text
            const data = await pdf(buffer);
            text = data.text.replace(/\x00/g, '');
        }
    } else if (fileName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
    } else if (fileName.match(/\.(mp4|webm|mov)$/)) {
        text = "Video content. Please generate a course structure relevant to the title.";
    } else {
        throw new Error(`Unsupported file type: ${fileName}`);
    }

    let structure: any = {};

    if (isCompliance) {
        // Skip AI for Compliance
        structure = {
            title: customTitle || fileName.replace(/\.[^/.]+$/, ""),
            chapters: chapters // Use extracted pages
        };
    } else {
        // Standard AI Processing
        // Standard AI Processing
        // Fetch API Key from Author's Company
        let apiKey = process.env.GROQ_API_KEY || "";

        try {
            const author = await prisma.user.findUnique({
                where: { id: authorId },
                include: { company: true }
            });

            if (author?.company?.apiConfig) {
                let config = author.company.apiConfig;
                if (typeof config === 'string') {
                    try { config = JSON.parse(config); } catch (e) { }
                }
                const typedConfig = config as any;
                if (typedConfig?.groqKey) {
                    apiKey = typedConfig.groqKey;
                }
            }
        } catch (e) {
            console.error("Failed to fetch API key for ingest author", e);
        }

        structure = await processWithGroq(text, category, apiKey);
    }

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
            isCompliance: isCompliance,
            thumbnail: thumbnailUrl || '/assets/placeholder-course.png',
            sourceText: text, // Store full text for potential future AI use
            fileUrl: fileUrl,
            authorId: authorId,
            chapters: {
                create: structure.chapters?.map((ch: any) => ({
                    title: ch.title,
                    topics: {
                        create: ch.topics?.map((t: any) => ({
                            title: typeof t === 'string' ? t : t.title, // Handle both string (AI) and object (Compliance)
                            type: 'text',
                            content: typeof t === 'string' ? "" : (t.content || "") // Pre-fill content if available
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
        chapters: structure.chapters
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
        const isCompliance = formData.get('isCompliance') === 'true';

        console.log(`[Ingest] Finalize - Title: ${customTitle}, Thumb: ${thumbnailUrl}, File: ${fileName}`);

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

        const data = await processFile(finalFilePath, finalFileName, category, customTitle, description, thumbnailUrl, authorId, subCategoryId, isCompliance);

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
