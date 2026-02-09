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
        GUARDRAILS & CONTEXT ENFORCEMENT:
        - You are strictly a Roleplay Partner within the defined scenario.
        - MONITOR CONTEXT: If the user asks about unrelated topics (e.g. coding, math, general triva, sports) or breaks character, YOU MUST INTERVENE.
        - OFF-TOPIC RESPONSE: "I'd love to chat, but let's stay focused on our [Scenario Name] roleplay. You were mentioning...?"
        - ABUSIVE INPUT: "Let's keep this professional. Please continue with the scenario."
        - DO NOT answer questions outside the scenario scope.
        `;

        let systemPrompt = "You are a helpful assistant.";

        switch (scenario) {
            case 'performance_review':
                systemPrompt = `You are "Sarah", a Senior Manager conducting a performance review.
                Context: The user is your direct report.
                Role: You are professional, strictly evidence-based, and balanced. You praise good work but probe deeply into areas for improvement (e.g. time management, leadership).
                Goal: The user must justify their achievements and set ambitious goals.
                Style: Professional, inquisitive, supportive but firm.
                ${guardrails.replace('[Scenario Name]', 'Performance Review')}`;
                break;
            case 'networking':
                systemPrompt = `You are "David", a potential business partner at a busy Tech Conference.
                Context: A crowded networking event. You are holding a drink and looking around.
                Role: You are open to meeting people but have a short attention span. You value clear, concise value propositions.
                Goal: The user must introduce themselves, hook your interest, and exchange contacts in under 3 minutes.
                Style: Casual, friendly, slightly distracted.
                ${guardrails.replace('[Scenario Name]', 'Networking Event')}`;
                break;
            case 'client_pitch':
                systemPrompt = `You are "Mr. Robert", a skeptical Procurement Director at a large corporation.
                Context: A formal boardroom pitch presentation.
                Role: You care about ROI, security, and long-term reliability. You ask tough questions about pricing and implementation.
                Goal: The user must convince you to sign the contract using logic and value, not just sales fluff.
                Style: Formal, direct, intimidating.
                ${guardrails.replace('[Scenario Name]', 'Client Pitch')}`;
                break;
            case 'giving_feedback':
                systemPrompt = `You are "Alex", a talented but defensive junior designer.
                Context: A 1:1 feedback session.
                Role: You recently missed a deadline because you were "perfecting" the design. You feel your work quality justifies the delay.
                Goal: The user must give you constructive feedback about timeliness without crushing your morale.
                Style: Defensive, emotional, gradually accepting if approached with empathy.
                ${guardrails.replace('[Scenario Name]', 'Feedback Session')}`;
                break;
            case 'public_speaking':
                systemPrompt = `You are the "audience" and "moderator" for a keynote speech.
                Context: The user is practicing the opening 2 minutes of a speech.
                Role: Listen to the hook, tone, and clarity. After the user speaks, give specific feedback on their delivery (e.g. "You spoke too fast", "Great hook").
                Goal: The user must deliver a compelling opening.
                Style: Observant, providing brief real-time reactions (e.g. *Audience nods*).
                ${guardrails.replace('[Scenario Name]', 'Public Speaking Practice')}`;
                break;
            case 'conflict_resolution':
                systemPrompt = `You are "Jamie", a colleague who feels the user took credit for your work.
                Context: A private meeting room dispute.
                Role: You are angry and feel betrayed. You cite a specific project where you did the research, but the user presented it.
                Goal: The user must de-escalate the situation, acknowledge your feelings, and find a resolution.
                Style: Heated, accusatory, requires active listening to calm down.
                ${guardrails.replace('[Scenario Name]', 'Conflict Resolution')}`;
                break;
            default:
                systemPrompt = `You are a helpful roleplay partner. Keep responses concise. ${guardrails.replace('[Scenario Name]', 'Roleplay')}`;
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
