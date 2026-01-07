import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { PrismaClient } from '@prisma/client';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, topicId, courseId, context, topicTitle } = body; // context/topicTitle might be passed for ad-hoc requests

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ content: generateFallback(type, topicTitle || "Topic") });
        }

        const groq = new Groq({ apiKey });
        const prisma = new PrismaClient();

        // 1. Fetch Context from DB if topicId is provided
        let sourceText = context || "";
        let currentContent: any = {};
        let topic;

        if (topicId) {
            topic = await prisma.topic.findUnique({
                where: { id: topicId },
                include: { chapter: true }
            });
            if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

            // Parse existing content
            try {
                currentContent = topic.content ? JSON.parse(topic.content) : {};
            } catch (e) {
                // If it's a plain string, treat it as 'text'
                currentContent = { text: topic.content };
            }

            // Check if we already have the requested content
            if (type === 'smart_notes' && currentContent.text) {
                return NextResponse.json({ content: currentContent.text });
            }
            if (type === 'quiz' && currentContent.quiz) {
                return NextResponse.json({ content: currentContent.quiz });
            }
            if (type === 'flashcards' && currentContent.flashcards) {
                return NextResponse.json({ content: currentContent.flashcards });
            }
            if (type === 'summary' && currentContent.summary) {
                return NextResponse.json({ content: currentContent.summary });
            }

            // If we need to generate, fetch the Course Source Text
            if (!sourceText) {
                const course = await prisma.course.findUnique({
                    where: { id: courseId || topic.chapter.courseId },
                    select: { sourceText: true }
                });
                sourceText = course?.sourceText || "";
            }
        }

        // Limit context size
        const safeContext = sourceText.substring(0, 25000);
        const titleInfo = topic ? `Topic: ${topic.title}` : `Topic: ${topicTitle}`;

        // 2. Define System Prompts
        let systemPrompt = "You are a helpful AI tutor.";
        let userPrompt = `Context: ${safeContext}\n\n${titleInfo}`;

        // Output format instruction
        const jsonInstruction = `Return ONLY valid JSON. Do not include markdown formatting.`;

        switch (type) {
            case 'smart_notes': // The main content view
            case 'initial_content':
                systemPrompt = `You are an expert professor. Create comprehensive, engaging "Smart Notes" for the provided topic based *strictly* on the context.
                styles: Use HTML formatting (<h3>, <p>, <ul>, <li>, <strong>).
                Structure:
                - Introduction
                - Key Concepts (Bullet points)
                - Detailed Analysis
                - Real-world Application
                Include emoji where appropriate to make it fun.
                Return ONLY the HTML string.`;
                userPrompt = `Context: ${safeContext}\n\nWrite Smart Notes for: ${topic?.title || topicTitle}`;
                break;

            case 'summary':
                systemPrompt = `You are an expert tutor. Create a concise summary.`;
                break;

            case 'quiz':
                systemPrompt = `Create a multiple-choice quiz (3 questions).
                Format: [{"question": "...", "options": ["..."], "correctAnswer": 0}]
                ${jsonInstruction}`;
                break;

            case 'flashcards':
                systemPrompt = `Create 5 flashcards.
                Format: [{"front": "...", "back": "..."}]
                ${jsonInstruction}`;
                break;

            case 'mindmap':
                systemPrompt = `You are a Mermaid.js expert. Create a mindmap for the topic.
                Return ONLY the raw Mermaid syntax starting with 'mindmap'.
                Do not include markdown code blocks (\`\`\`mermaid) or conversational text.
                Do not use special characters in node labels.`;
                break;

            case 'explain':
                systemPrompt = `Explain the selected term clearly in 2 sentences.`;
                userPrompt = `Context: ${safeContext}\n\nExplain term: ${topicTitle}`;
                break;
        }

        // 3. Call Groq
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 2048,
        });

        let generatedContent = completion.choices[0]?.message?.content || "";

        // 4. Save to DB (Persistent Caching)
        if (topicId && type !== 'explain') { // Don't save ad-hoc explanations
            let updateData: any = {};

            // Clean JSON if needed
            if (type === 'quiz' || type === 'flashcards') {
                generatedContent = generatedContent.replace(/```json/g, '').replace(/```/g, '').trim();
                try {
                    updateData[type] = JSON.parse(generatedContent);
                } catch (e) { console.error("JSON Parse Error", e); }
            } else if (type === 'smart_notes' || type === 'initial_content') {
                updateData['text'] = generatedContent;
            } else if (type === 'summary') {
                updateData['summary'] = generatedContent;
            } else if (type === 'mindmap') {
                // Aggressive cleanup: Find the start of 'mindmap' and ignore usage of fences
                const match = generatedContent.match(/mindmap[\s\S]*/);
                if (match) {
                    generatedContent = match[0].replace(/```/g, '').trim();
                } else {
                    generatedContent = generatedContent.replace(/```mermaid/g, '').replace(/```/g, '').trim();
                }
                updateData['mindMap'] = generatedContent;
            }

            // Merge with existing content
            const newContentObj = { ...currentContent, ...updateData };

            await prisma.topic.update({
                where: { id: topicId },
                data: { content: JSON.stringify(newContentObj) }
            });
        }

        // Check if we need to return parsed JSON or string
        if ((type === 'quiz' || type === 'flashcards') && typeof generatedContent === 'string') {
            try {
                return NextResponse.json({ content: JSON.parse(generatedContent) });
            } catch (e) {
                return NextResponse.json({ content: generatedContent });
            }
        }

        return NextResponse.json({ content: generatedContent });

    } catch (error) {
        console.error('AI Generation error:', error);
        return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
    }
}

function generateFallback(type: string, title: string) {
    switch (type) {
        case 'summary':
            return `(Groq Unavailable) This is a placeholder summary for ${title}. Please configure the Groq API key.`;
        case 'quiz':
            return JSON.stringify([
                {
                    question: `What is the main focus of ${title}? (Demo)`,
                    options: ["Learning", "Sleeping", "Eating", "Driving"],
                    correctAnswer: 0
                }
            ]);
        case 'mindmap':
            return `
        mindmap
          root((${title}))
            Concept A
            Concept B
            Concept C
      `;
        case 'flashcards':
            return JSON.stringify([
                { front: "BATNA", back: "Best Alternative to a Negotiated Agreement" },
                { front: "ZOPA", back: "Zone of Possible Agreement" },
                { front: "Reservation Price", back: "The least favorable point at which one will accept a deal" }
            ]);
        case 'explain':
            return `(Demo Explanation) **${title}** is a key concept. (Groq API unavailable).`;
        default:
            return "Content unavailable.";
    }
}
