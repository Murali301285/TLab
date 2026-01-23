import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { PrismaClient } from '@prisma/client';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, topicId, courseId, context, topicTitle, questionCount } = body; // context/topicTitle might be passed for ad-hoc requests

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
                
                CRITICAL INSTRUCTION: DO NOT USE EMOJIS. Content must be professional and clean.

                Structure:
                - Use # (H1) for the Main Topic.
                - Use ## (H2) for Sections.
                - Use ### (H3) for Sub-sections.
                - Use **Bold** for emphasis.
                - Use > for key takeaways or quotes.
                - Use lists (-) for features/steps.

                Required Sections:
                1. ## Executive Summary (TL;DR)
                2. ## Core Concepts
                3. ## Detailed Analysis
                4. ## Real-World Application
                5. ## Checklist / Key Takeaways

                Format: Return ONLY valid Markdown. NO HTML. NO Emojis.`;
                userPrompt = `Context: ${safeContext}\n\nWrite structured Smart Notes (in Markdown) for: ${topic?.title || topicTitle}. Remember: NO Emojis.`;
                break;

            case 'summary':
                systemPrompt = `You are an expert tutor. Create a concise summary.`;
                break;

            case 'quiz':
                const qCount = questionCount || 3;
                systemPrompt = `Create a multiple-choice quiz (${qCount} questions).
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
                
                CRITICAL: The mindmap MUST have exactly ONE root node.
                Structure:
                mindmap
                  root((Main Topic))
                    Branch 1
                      Leaf A
                    Branch 2
                      Leaf B

                Do not include markdown code blocks (\`\`\`mermaid) or conversational text.
                Do not use special characters in node labels.`;
                break;

            case 'visualize':
                // Dynamic Infographic Engine Prompt
                systemPrompt = `You are a Visual Information Architect. 
                Your goal is to turn the text into a rich "Infographic Structure" (JSON).
                
                Analyze the content and choose the best "Modules" to visualize it. You can use multiple modules.
                
                Available Modules:
                1. "process_flow": For steps, sequences, or cycles.
                   Format: { "type": "process_flow", "title": "...", "steps": [{ "label": "...", "icon": "icon-name", "desc": "..." }] }
                2. "comparison_grid": For comparing 2-3 items.
                   Format: { "type": "comparison_grid", "title": "...", "items": [{ "title": "...", "icon": "...", "points": ["..."] }] }
                3. "key_concepts": For defining terms or grouping ideas.
                   Format: { "type": "key_concepts", "title": "...", "concepts": [{ "title": "...", "icon": "...", "desc": "..." }] }
                4. "timeline": For historical events or schedules.
                   Format: { "type": "timeline", "title": "...", "events": [{ "year": "...", "title": "...", "desc": "..." }] }
                5. "statistics": For data points or numbers.
                   Format: { "type": "statistics", "title": "...", "stats": [{ "value": "...", "label": "...", "icon": "..." }] }

                IMPORTANT - ICONOGRAPHY:
                For every 'icon' field, suggest a valid icon name from the "Lucide React" library (e.g., "tractor", "leaf", "shield", "user", "zap", "file-text").
                If unsure, use a generic one like "circle" or "star".

                IMPORTANT - GRAPH / MINDMAP:
                You MUST include a detailed "graph" object for the Mind Map view.
                - It must be a HIERARCHICAL tree.
                - 1 Central Root Node (The Main Topic).
                - At least 4-5 Major Branches (Key Concepts).
                - At least 3-5 Sub-nodes per branch.
                - TOTAL NODES MUST BE AT LEAST 20-30.
                
                "graph": {
                    "nodes": [
                        { "id": "Main Topic", "group": 0, "label": "Main Topic" },
                        { "id": "Key Concept 1", "group": 1, "label": "Short Label" },
                        { "id": "Sub Detail A", "group": 2, "label": "Detail" }
                    ],
                    "links": [
                        { "source": "Main Topic", "target": "Key Concept 1" },
                        { "source": "Key Concept 1", "target": "Sub Detail A" }
                    ]
                }
                
                Return a JSON Object:
                {
                  "summary": "Short title of the infographic",
                  "modules": [ ...array of modules... ],
                  "graph": { "nodes": [], "links": [] }
                }
                
                ${jsonInstruction}`;
                if (userPrompt) {
                    userPrompt = `Context: ${safeContext}\n\nCreate a colorful Infographic structure for: ${topicTitle}. Ensure the 'graph' has at least 20-25 nodes.`;
                }
                break;

            case 'scrollytelling':
                systemPrompt = `You are a Digital Storyteller.
                Your goal is to explain the topic as a "Scrollytelling Journey".
                Break the content into 4-6 sequential "Story Steps".

                For each step:
                1. "title": Short impactful headline.
                2. "text": 2-3 sentences explaining the concept.
                3. "imageKeyword": A single noun describing a visual for this step (e.g. "factory", "document", "cloud", "network").
                4. "color": A tailwind color class (e.g. "bg-blue-500", "bg-red-500").

                Return JSON:
                {
                    "title": "Main Journey Title",
                    "steps": [
                        { "title": "...", "text": "...", "imageKeyword": "...", "color": "..." }
                    ]
                }
                ${jsonInstruction}`;
                userPrompt = `Context: ${safeContext}\n\nCreate a Scrollytelling journey for: ${topicTitle}`;
                break;

            case 'podcast':
                systemPrompt = `You are a scriptwriter for an educational podcast. Create a dialogue between a Host (curious) and an Expert (knowledgeable).
                Format: [{"speaker": "Host", "text": "..."}, {"speaker": "Expert", "text": "..."}]
                Keep it engaging, conversational, and under 5 minutes reading time.
                ${jsonInstruction}`;
                break;

            case 'simplification':
                const analogyInfo = (body.analogy && body.analogy !== 'General') ? body.analogy : null;
                const analogyPrompt = analogyInfo
                    ? `Explain this strictly using an Analogy/Metaphor related to "${analogyInfo}".`
                    : `Explain this using a simple real-world analogy (e.g. Pizza delivery, Library, Traffic).`;

                systemPrompt = `You are an expert at simplifying complex topics using analogies (ELI5).
                Structure:
                1. "The Analogy": The metaphor story.
                2. "The Concept": How the analogy maps back to the technical topic.
                Format: Return a simple markdown string with two sections. NO JSON symbols.
                
                Style: Make it fun and relatable.`;
                userPrompt = `Context: ${safeContext}\n\n${analogyPrompt} Topic: ${topicTitle || "The Topic"}`;
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
                // Invalidate legacy string mindmap cache
                if (currentContent.mindMap && typeof currentContent.mindMap === 'string') {
                    console.log(`Invalidating string mindmap for topic ${topicId}`);
                    // By not setting updateData['mindMap'] here, it will be regenerated.
                } else {
                    generatedContent = generatedContent.replace(/```json/g, '').replace(/```/g, '').trim();
                    try {
                        updateData['mindMap'] = JSON.parse(generatedContent);
                    } catch (e) { console.error("MindMap JSON Parse Error", e); }
                }
            } else if (type === 'podcast') {
                generatedContent = generatedContent.replace(/```json/g, '').replace(/```/g, '').trim();
                try {
                    updateData['podcast'] = JSON.parse(generatedContent);
                } catch (e) {
                    console.error("Podcast JSON Parse Error", e);
                }
            } else if (type === 'simplification') {
                updateData['simplification'] = generatedContent;
            }

            // Merge with existing content
            const newContentObj = { ...currentContent, ...updateData };

            await prisma.topic.update({
                where: { id: topicId },
                data: { content: JSON.stringify(newContentObj) }
            });
        }

        // Check if we need to return parsed JSON or string
        if ((type === 'quiz' || type === 'flashcards' || type === 'podcast' || type === 'mindmap') && typeof generatedContent === 'string') {
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
            return JSON.stringify({
                graph: {
                    nodes: [
                        { id: title, group: 0, label: title },
                        { id: "Concept A", group: 1, label: "Concept A" },
                        { id: "Concept B", group: 1, label: "Concept B" },
                        { id: "Concept C", group: 1, label: "Concept C" },
                        { id: "Detail A1", group: 2, label: "Detail A1" }
                    ],
                    links: [
                        { source: title, target: "Concept A" },
                        { source: title, target: "Concept B" },
                        { source: title, target: "Concept C" },
                        { source: "Concept A", target: "Detail A1" }
                    ]
                }
            });
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
