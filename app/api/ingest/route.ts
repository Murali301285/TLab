import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
// const pdf = require('pdf-parse'); // Moved inside handler
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Chapter {
    title: string;
    topics: string[];
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const category = formData.get('category') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convert file to buffer for pdf-parse
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 1. Extract Text from PDF
        // Note: For Gemini, we could upload the PDF directly, but extracting text is safer/cheaper for now
        let text = '';
        try {
            // @ts-ignore
            const pdf = require('pdf-parse');
            const data = await pdf(buffer);
            text = data.text;
        } catch (e) {
            console.error("PDF Parse Error:", e);
            return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 });
        }

        // 2. AI Processing
        // Priority: Google Gemini (Cloud) -> Ollama (Local) -> Heuristics (Fallback)

        let extractedData;
        const apiKey = process.env.GEMINI_API_KEY;

        if (apiKey) {
            try {
                console.log("Using Google Gemini 1.5 Flash...");
                extractedData = await processWithGemini(text, category, apiKey);
            } catch (e) {
                console.error("Gemini failed, falling back...", e);
            }
        }

        if (!extractedData) {
            try {
                // Only try Ollama if we are in a dev environment or explicitly configured
                // console.log("Attempting Local Ollama...");
                // extractedData = await processWithOllama(text, category);
                throw new Error("Skipping Ollama for production stability");
            } catch (e) {
                console.log("Using heuristic fallback.");
                extractedData = processWithHeuristics(text, file.name, category);
            }
        }

        return NextResponse.json(extractedData);

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// --- Google Gemini Logic ---
async function processWithGemini(text: string, category: string, apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    You are an expert educational content creator. 
    Analyze the following text from a document about "${category}".
    Extract the course title and a list of chapters with their sub-topics.
    
    Return ONLY valid JSON in this format:
    {
      "title": "Course Title",
      "category": "${category}",
      "chapters": [
        {
          "title": "Chapter 1 Title",
          "topics": ["Topic 1.1", "Topic 1.2"]
        }
      ]
    }

    Text content:
    ${text.substring(0, 30000)} // Gemini Flash handles 1M tokens, but we limit for safety
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();

    // Clean up markdown code blocks if present
    const jsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);
}

// --- Local / Fallback Logic ---

async function processWithOllama(text: string, category: string) {
    const context = text.substring(0, 10000);

    const prompt = `
    You are an expert educational content creator. 
    Analyze the following text from a document about "${category}".
    Extract the course title and a list of chapters with their sub-topics.
    
    Return ONLY valid JSON in this format:
    {
      "title": "Course Title",
      "category": "${category}",
      "chapters": [
        {
          "title": "Chapter 1 Title",
          "topics": ["Topic 1.1", "Topic 1.2"]
        }
      ]
    }

    Text content:
    ${context}
  `;

    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: "phi3:latest",
            prompt: prompt,
            stream: false,
            format: "json"
        })
    });

    if (!response.ok) {
        throw new Error('Ollama failed');
    }

    const data = await response.json();
    return JSON.parse(data.response);
}

function processWithHeuristics(text: string, filename: string, category: string) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const title = lines[0] || filename.replace('.pdf', '');

    const chapters: Chapter[] = [];
    let currentChapter: Chapter | null = null;

    if (text.length < 500) {
        return {
            title: title,
            category: category,
            chapters: [
                {
                    title: "1. Overview",
                    topics: ["Introduction to " + category, "Key Concepts"]
                },
                {
                    title: "2. Detailed Analysis",
                    topics: ["Core Principles", "Implementation Strategies"]
                }
            ]
        };
    }

    const chapterRegex = /^(chapter|section|\d+\.)/i;

    for (let i = 0; i < Math.min(lines.length, 100); i++) {
        const line = lines[i].trim();
        if (chapterRegex.test(line) || (line === line.toUpperCase() && line.length > 5)) {
            if (currentChapter) {
                chapters.push(currentChapter);
            }
            currentChapter = {
                title: line,
                topics: []
            };
        } else if (currentChapter && currentChapter.topics.length < 4) {
            if (line.length > 10 && line.length < 100) {
                currentChapter.topics.push(line);
            }
        }
    }

    if (currentChapter) chapters.push(currentChapter);

    if (chapters.length === 0) {
        chapters.push({
            title: "1. " + category + " Fundamentals",
            topics: ["Introduction", "Scope", "Objectives"]
        });
        chapters.push({
            title: "2. Advanced Concepts",
            topics: ["Methodologies", "Case Studies"]
        });
    }

    return {
        title: title,
        category: category,
        chapters: chapters.slice(0, 5)
    };
}
