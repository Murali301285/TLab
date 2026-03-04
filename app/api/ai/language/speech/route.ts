import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { payload: jwtPayload } = await jwtVerify(token, JWT_SECRET);
        const userId = (jwtPayload.id || jwtPayload.userId) as string;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { text, languageCode = 'en-IN', gender = 'female' } = body;

        console.log(`DEBUG: TTS Requested. Text Length: ${text?.length}, Lang: ${languageCode}, Gender: ${gender}`);

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: "Missing or empty text" }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { company: true }
        });

        let apiConfig = dbUser?.company?.apiConfig as any;
        if (typeof apiConfig === 'string') {
            try { apiConfig = JSON.parse(apiConfig); } catch (e) { console.error("Could not parse apiConfig string"); }
        }

        const sarvamKey = apiConfig?.SARVAM_API_KEY || apiConfig?.sarvamKey || process.env.SARVAM_API_KEY;

        if (!sarvamKey) {
            console.error("DEBUG: SARVAM_API_KEY is missing from environment variables and Company Config.");
            return NextResponse.json({ error: "SARVAM_API_KEY not configured" }, { status: 500 });
        }

        // Bulbul V3 model speakers mapping
        // Female: priya, neha, shruti, suhani, kavitha, rupali
        // Male: aditya, ashutosh, tarun, sunny, mani, gokul, vijay, mohit, rehan, soham
        const speaker = gender.toLowerCase() === 'male' ? 'aditya' : 'priya';

        const payload = {
            inputs: [text],
            target_language_code: languageCode,
            speaker: speaker,
            speech_sample_rate: 8000,
            enable_preprocessing: true,
            model: 'bulbul:v3'
        };

        const response = await fetch('https://api.sarvam.ai/text-to-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': sarvamKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`DEBUG: Sarvam TTS Failed (${response.status}):`, errorText);
            return NextResponse.json({ error: "TTS Generation Failed", details: errorText }, { status: response.status });
        }

        const data = await response.json();

        if (!data.audios || data.audios.length === 0) {
            throw new Error("API returned success but no audios array found");
        }

        const base64Audio = data.audios[0];

        return NextResponse.json({ audio: base64Audio });

    } catch (error) {
        console.error('Sarvam TTS API Error Full Stack:', error);
        return NextResponse.json({ error: 'Failed to generate speech backend proxy', details: String(error) }, { status: 500 });
    }
}
