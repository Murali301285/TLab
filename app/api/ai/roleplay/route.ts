import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, scenario, sessionId } = body;

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const groq = new Groq({ apiKey });

        // 1. Define "Personas" & Guardrails
        const guardrails = `
        GUARDRAILS:
        - You are strictly a Roleplay Partner.
        - If the user breaks character, asks off-topic questions (e.g. "write code", "math"), or is abusive, POLITELY REFUSE.
        - Refusal Example: "Let's stay in character for our roleplay. What were you saying about...?"
        `;

        let systemPrompt = "You are a helpful assistant.";

        switch (scenario) {
            case 'negotiation':
                systemPrompt = `You are "Robert", a tough potential client. 
                Role: You are skeptical about the price and need convincing. Firm but professional.
                Goal: User must convince you of the value.
                Style: Short, conversational responses.
                ${guardrails}`;
                break;
            case 'conflict':
                systemPrompt = `You are "Sarah", a frustrated team member.
                Role: You feel overworked and unheard.
                Goal: User must de-escalate and find a solution.
                Style: Emotional, defensive initially.
                ${guardrails}`;
                break;
            case 'interview':
                systemPrompt = `You are "Ms. Jenkins", a Senior Hiring Manager.
                Role: Interviewing the user for a Leadership position.
                Goal: Assess soft skills.
                Style: Professional, asking behavioral questions.
                ${guardrails}`;
                break;
            case 'feedback':
                systemPrompt = `You are "Alex", a junior employee receiving feedback.
                Role: You tried your best but made a mistake.
                Goal: User must give constructive feedback without discouraging you.
                Style: Apologetic, sensitive.
                ${guardrails}`;
                break;
            case 'networking': // NEW SCENARIO
                systemPrompt = `You are "David", a potential business partner at a tech conference.
                Role: You are open to networking but busy.
                Goal: User must introduce themselves and spark interest in under 2 minutes.
                Style: Friendly but distracted.
                ${guardrails}`;
                break;
            default:
                systemPrompt = `You are a helpful roleplay partner. Keep responses concise. ${guardrails}`;
        }

        // 2. Save User Message (if sessionId provided)
        if (sessionId) {
            const lastMsg = messages[messages.length - 1]; // Assuming valid
            if (lastMsg.role === 'user') {
                await prisma.coachMessage.create({
                    data: {
                        sessionId,
                        role: 'user',
                        content: lastMsg.content
                    }
                });
            }
        }

        // 3. Generate AI Response
        const fullMessages = [
            { role: "system", content: systemPrompt },
            ...messages
        ];

        const completion = await groq.chat.completions.create({
            messages: fullMessages as any,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 150,
        });

        const reply = completion.choices[0]?.message?.content || "(Silence)";

        // 4. Save AI Response
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
        console.error('Roleplay API Error:', error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
