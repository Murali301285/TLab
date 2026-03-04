import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '@/lib/crypto';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const { message, sessionId, history = [] } = await req.json();

        // 1. Fetch Session for Context
        const session = await prisma.coachSession.findUnique({
            where: { id: sessionId },
            include: {
                user: {
                    include: {
                        company: true
                    }
                }
            }
        });

        if (!session) {
            console.error(`DEBUG: Session ${sessionId} not found.`);
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        console.log(`DEBUG: Session Found. User: ${session.user.email}, Company: ${session.user.company?.name}`);

        const config = (session.config as any) || {};
        const mode = session.mode; // IMPROVE, TEACH, TRANSLATE
        const cat = config.category || 'International'; // Regional vs International context
        const isRegional = cat === 'Regional';

        // 2. Resolve API Keys
        let groqKey = process.env.GROQ_API_KEY;
        let sarvamKey = process.env.SARVAM_API_KEY;
        let source = "ENV";

        if (session.user.company?.apiConfig) {
            let apiConfig = session.user.company.apiConfig as any;

            if (typeof apiConfig === 'string') {
                try { apiConfig = JSON.parse(apiConfig); } catch (e) { console.error("Could not parse apiConfig string"); }
            }

            if (apiConfig?.groqKey) {
                try {
                    groqKey = decrypt(apiConfig.groqKey);
                    source = "DB (Company)";
                } catch (e) {
                    console.error("DEBUG: Failed to decrypt Groq Key from Company config. It might be unencrypted legacy data or corrupted.", e);
                    // Fallback to the raw string if decryption fails
                    groqKey = apiConfig.groqKey;
                    source = "DB (Raw)";
                }
            }
            if (apiConfig.sarvamKey) {
                sarvamKey = apiConfig.sarvamKey;
            }
        }

        const useSarvam = isRegional && !!sarvamKey;

        console.log(`DEBUG: Target context: ${cat}. Using Sarvam: ${useSarvam}. Key Source: ${source}`);

        if (!useSarvam && !groqKey) {
            console.error("DEBUG: CRITICAL - GROQ_API_KEY is missing from both ENV and Company DB config, and Sarvam is either not applicable or its key is missing.");
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const groq = groqKey ? new Groq({ apiKey: groqKey }) : null;

        // 2. Construct Dynamic System Prompt
        let systemPrompt = `You are an expert Language Coach.`;

        // Guardrail Instruction
        const guardrails = `
        GUARDRAILS & SAFETY:
        - You are STRICTLY a Language Coach. 
        - If the user asks about coding, math, general knowledge unrelated to language learning, or sensitive topics, POLITELY REFUSE.
        - Example Refusal: "I'm here to help you with languages. Let's get back to learning!"
        - Do not execute code or answer off-topic questions.
        - DO NOT USE EMOJIS UNDER ANY CIRCUMSTANCES. Reply with clean text only.
        `;

        if (mode === 'IMPROVE' || mode === 'TEACH') {
            const lang = config.language || 'English';

            systemPrompt += `
            Your goal is to help the user IMPROVE/LEARN ${lang} (${cat} Context).
            
            Guidelines:
            1. If user speaks English, explain in English but provide the ${lang} translation/script.
            2. If user speaks ${lang}, reply in ${lang} to maintain immersion.
            3. Correct grammar politely. Suggest better vocabulary.
            4. Keep responses concise (under 3-4 sentences) unless explaining a complex concept.
            `;

            if (cat === 'Regional') {
                systemPrompt += `
                STYLE - INDIAN CONTEXT (CRITICAL):
                - YOU MUST SPEAK IN "INDIAN ENGLISH" (Ind-Eng).
                - Use typical Indianisms frequently and naturally:
                  * "Do the needful", "prepone", "Actually...", "only" (e.g., "I am coming only"), "passed out" (graduated).
                  * "Where are you put up?" (Where do you live?), "What is your good name?".
                - Tone: Warm, respectful, slightly informal like a local tutor or elder sister. Use "Ji" or "Dear" affectionately.
                - Code Mixing: Freely mix Hindi/Tamil words if the user does (Hinglish/Tanglish).
                - Example: "Hello Ji! Actually, I was thinking we can start the lesson now only. What do you say?"
                `;
            }

            systemPrompt += `
            ${guardrails}
            `;

            console.log("DEBUG: Generated System Prompt:", systemPrompt);
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

        let apiMessages: any[] = [];

        if (useSarvam) {
            // Sarvam strictly requires alternating roles starting with 'user'
            const rawMessages = [...history, { role: "user", content: message }];

            if (rawMessages.length > 0 && rawMessages[0].role !== 'user') {
                rawMessages.unshift({ role: 'user', content: 'Hello' });
            }

            for (const msg of rawMessages) {
                if (apiMessages.length === 0) {
                    apiMessages.push({ ...msg });
                } else {
                    const lastMsg = apiMessages[apiMessages.length - 1];
                    if (lastMsg.role === msg.role) {
                        lastMsg.content += `\n\n${msg.content}`;
                    } else {
                        apiMessages.push({ ...msg });
                    }
                }
            }

            // Prepend system prompt to the first user message
            if (apiMessages.length > 0 && apiMessages[0].role === 'user') {
                apiMessages[0].content = `[System Instructions: ${systemPrompt}]\n\n${apiMessages[0].content}`;
            }

        } else {
            apiMessages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: message }
            ];
        }

        // 3. Save User Message
        await prisma.coachMessage.create({
            data: {
                sessionId,
                role: 'user',
                content: message
            }
        });

        const modelToUse = useSarvam
            ? "sarvam-m"
            : (config.model || "llama-3.3-70b-versatile");

        console.log(`DEBUG: Using Model: ${modelToUse}, Config Model: ${config.model}`);

        // 4. Call AI
        try {
            let reply = "";

            if (useSarvam) {
                const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-subscription-key': sarvamKey!
                    },
                    body: JSON.stringify({
                        model: modelToUse, // specifically using 'sarvam-m'
                        messages: apiMessages,
                        temperature: 0.7,
                        max_tokens: 1024
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("DEBUG: Sarvam API Auth/Request Failed:", errorText);
                    throw new Error(`Sarvam API Error: ${response.status} ${errorText}`);
                }

                const data = await response.json();
                reply = data.choices[0]?.message?.content || "I apologize, I couldn't generate a response.";
            } else {
                if (!groq) throw new Error("Groq API key missing but tried to fallback.");
                const completion = await groq.chat.completions.create({
                    messages: apiMessages as any,
                    model: modelToUse,
                    temperature: 0.7,
                    max_tokens: 1024,
                });
                reply = completion.choices[0]?.message?.content || "I apologize, I couldn't generate a response.";
            }

            // 5. Save Assistant Message
            await prisma.coachMessage.create({
                data: {
                    sessionId,
                    role: 'assistant',
                    content: reply
                }
            });

            return NextResponse.json({ reply });

        } catch (groqError: any) {
            console.error("DEBUG: Groq API Request Failed:", groqError);
            console.error("DEBUG: Error JSON:", JSON.stringify(groqError, null, 2));
            throw groqError; // Re-throw to catch below
        }

    } catch (error) {
        console.error('Language Coach API Error Full Stack:', error);
        return NextResponse.json({ error: 'Failed to generate response', details: String(error) }, { status: 500 });
    }
}
