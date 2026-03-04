import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { PrismaClient } from '@prisma/client';
import { getGroqKeyForUser } from '@/lib/ai-config';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const { message, topic, context, history, sessionId } = await req.json();

        const { apiKey } = await getGroqKeyForUser(req);
        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const groq = new Groq({ apiKey });

        // 1. Save User Message
        if (sessionId) {
            await prisma.coachMessage.create({
                data: {
                    sessionId,
                    role: 'user',
                    content: message
                }
            });
        }

        // 2. Define Strict Guardrails
        const systemPrompt = `You are an expert Visual Concept Coach.
    
    Current Topic: "${topic}"
    Context Summary: "${context?.summary || 'No summary available'}"
    
    Your goal is to help the user understand "${topic}" deeply.
    
    CRITICAL GUARDRAILS:
    1. STRICTLY check if the user's question is related to "${topic}".
    2. If the user asks about ANYTHING else (e.g., sports, movies, coding unrelated to topic, general chit-chat), you MUST refuse.
    3. Refusal Message: "Please stay in context. Ask relevant questions or details related to ${topic}."
    4. Do not offer to change the topic.
    
    If the question IS related, answer it clearly, explaining simply and effectively.
    `;

        const messages = [
            { role: "system", content: systemPrompt },
            ...history, // Pass limited history from frontend
            { role: "user", content: message }
        ];

        const completion = await groq.chat.completions.create({
            messages: messages as any,
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 1024,
        });

        const reply = completion.choices[0]?.message?.content || "I apologize, I couldn't generate a response.";

        // 3. Save AI Reply
        if (sessionId) {
            await prisma.coachMessage.create({
                data: {
                    sessionId,
                    role: 'assistant',
                    content: reply
                }
            });
        }

        return NextResponse.json({ reply });

    } catch (error) {
        console.error('Concept Chat API Error:', error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
