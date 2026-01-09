import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, scenario } = body; // messages = [{role: 'user', content: '...'}, ...]

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const groq = new Groq({ apiKey });

        // Define "Personas" based on scenario
        let systemPrompt = "You are a helpful assistant.";

        switch (scenario) {
            case 'negotiation':
                systemPrompt = `You are "Robert", a tough potential client. 
                Role: You are skeptical about the price and need convincing. You are not mean, but you are firm.
                Goal: The user is trying to sell you a software subscription.
                Style: Speak conversationally. Keep responses short (1-2 sentences) to allow back-and-forth.
                Initial State: You think the price is too high.`;
                break;
            case 'conflict':
                systemPrompt = `You are "Sarah", a frustrated team member.
                Role: You feel overworked and that the user (your manager) isn't listening.
                Goal: The user needs to de-escalate the situation and find a solution.
                Style: You are emotional and defensive initially.
                Initial State: You just missed a deadline and are worried about being blamed.`;
                break;
            case 'interview':
                systemPrompt = `You are "Ms. Jenkins", a Senior Hiring Manager.
                Role: You are interviewing the user for a Leadership position.
                Goal: Assess their soft skills and leadership style.
                Style: Professional, polite, but asking tricky questions.
                Initial State: You are asking "Tell me about a time you failed."`;
                break;
            case 'feedback':
                systemPrompt = `You are "Alex", a junior employee receiving feedback.
                Role: You tried your best but made a mistake. You are eager to learn but sensitive.
                Goal: The user needs to give constructive feedback without discouraging you.
                Style: Apologetic and attentive.`;
                break;
            default:
                systemPrompt = "You are a helpful roleplay partner. Keep responses concise.";
        }

        // Add System Prompt to the start
        const fullMessages = [
            { role: "system", content: systemPrompt },
            ...messages
        ];

        const completion = await groq.chat.completions.create({
            messages: fullMessages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7, // Slightly higher for "human-like" variance
            max_tokens: 150, // Keep it short for voice
        });

        const reply = completion.choices[0]?.message?.content || "(Silence)";

        return NextResponse.json({ reply });

    } catch (error) {
        console.error('Roleplay API Error:', error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
