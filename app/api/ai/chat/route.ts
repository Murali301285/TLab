import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, context } = body;

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ reply: "AI Service Unavailable (Missing Key)" });
        }

        const groq = new Groq({ apiKey });

        // System Prompt with Strict Guardrails
        const systemPrompt = `You are a strict but helpful Course Tutor Assistant.
        
        CONTEXT:
        ${context ? context.substring(0, 20000) : "No specific context provided."}

        RULES:
        1. Answer ONLY questions related to the provided CONTEXT.
        2. If the user asks about general knowledge, other topics, or anything not in the context (e.g., "What is the capital of France?", "Write me a poem about cats"), you MUST refuse.
        3. Refusal Message: "I can only answer questions related to this specific topic." (You may vary this slightly to be polite, but stay firm).
        4. Do not hallucinate information not present in the context.
        5. Be concise, clear, and encouraging.
        
        Your goal is to help the student understand THIS specific lesson, nothing else.`;

        // Prepare messages for Groq
        const conversation = [
            { role: "system", content: systemPrompt },
            ...messages.slice(-5) // Keep last 5 messages for context window efficiency
        ];

        const completion = await groq.chat.completions.create({
            messages: conversation,
            model: "llama-3.3-70b-versatile",
            temperature: 0.3, // Low temperature for factual accuracy
            max_tokens: 500,
        });

        const reply = completion.choices[0]?.message?.content || "I couldn't generate a response.";

        return NextResponse.json({ reply });

    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
    }
}
