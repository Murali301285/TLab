import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const { message, sessionId, history } = await req.json();

        // 1. Fetch Session for Context
        const session = await prisma.coachSession.findUnique({
            where: { id: sessionId },
            include: { user: true }
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const groq = new Groq({ apiKey });
        const config = session.config as any;
        const mode = session.mode; // IMPROVE, TEACH, TRANSLATE

        // 2. Construct Dynamic System Prompt
        let systemPrompt = `You are an expert Language Coach.`;

        // Guardrail Instruction
        const guardrails = `
        GUARDRAILS & SAFETY:
        - You are STRICTLY a Language Coach. 
        - If the user asks about coding, math, general knowledge unrelated to language learning, or sensitive topics, POLITELY REFUSE.
        - Example Refusal: "I'm here to help you with languages. Let's get back to learning!"
        - Do not execute code or answer off-topic questions.
        `;

        if (mode === 'IMPROVE' || mode === 'TEACH') {
            const lang = config.language || 'English';
            const cat = config.category || 'International'; // Regional vs International context

            systemPrompt += `
            Your goal is to help the user IMPROVE/LEARN ${lang} (${cat} Context).
            
            Guidelines:
            1. If user speaks English, explain in English but provide the ${lang} translation/script.
            2. If user speaks ${lang}, reply in ${lang} to maintain immersion.
            3. Correct grammar politely. Suggest better vocabulary.
            4. Keep responses concise (under 3-4 sentences) unless explaining a complex concept.
            ${guardrails}
            `;
        } else if (mode === 'TRANSLATE') {
            const source = config.sourceLang;
            const target = config.targetLang;
            systemPrompt += `
            Your goal is to act as a TRANSLATOR and TEACHER between ${source} and ${target}.
            
            Guidelines:
            1. Translate the user's input from ${source} to ${target} (or vice versa).
            2. Explain *why* the translation is constructed that way (grammar/vocabulary breakdown).
            3. Provide pronunciation tips if applicable.
            ${guardrails}
            `;
        }

        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ];

        // 3. Save User Message
        await prisma.coachMessage.create({
            data: {
                sessionId,
                role: 'user',
                content: message
            }
        });

        // 4. Call AI
        const completion = await groq.chat.completions.create({
            messages: messages as any,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
        });

        const reply = completion.choices[0]?.message?.content || "I apologize, I couldn't generate a response.";

        // 5. Save Assistant Message
        await prisma.coachMessage.create({
            data: {
                sessionId,
                role: 'assistant',
                content: reply
            }
        });

        return NextResponse.json({ reply });

    } catch (error) {
        console.error('Language Coach API Error:', error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
