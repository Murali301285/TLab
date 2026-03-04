import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { decrypt } from '@/lib/crypto';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

interface AIConfigResult {
    apiKey: string | null;
    userId: string | null;
    userName: string | null;
}

export async function getGroqKeyForUser(req: NextRequest): Promise<AIConfigResult> {
    try {
        console.log("---- [AI CONFIG] Fetching API Key ----");

        const token = req.cookies.get('auth-token')?.value;
        if (!token) {
            console.warn("---- [AI CONFIG] No Auth Token found in cookies");
            return { apiKey: process.env.GROQ_API_KEY || null, userId: null, userName: "Guest" };
        }

        let userId: string | null = null;
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            userId = (payload.id || payload.userId) as string;
            console.log("---- [AI CONFIG] Token Verified. User ID:", userId);
        } catch (e) {
            console.error("---- [AI CONFIG] Token Verification Failed:", e);
            return { apiKey: process.env.GROQ_API_KEY || null, userId: null, userName: "Guest" };
        }

        if (!userId) {
            console.warn("---- [AI CONFIG] No User ID in token payload");
            return { apiKey: process.env.GROQ_API_KEY || null, userId: null, userName: "Guest" };
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                name: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        apiConfig: true
                    }
                }
            }
        });

        if (!user) {
            console.warn("---- [AI CONFIG] User not found in DB");
            return { apiKey: process.env.GROQ_API_KEY || null, userId, userName: "Unknown" };
        }

        console.log("---- [AI CONFIG] User Found:", user.name);
        const userName = user.name || "Unknown";

        if (!user.company) {
            console.warn("---- [AI CONFIG] User has no company assigned");
            return { apiKey: process.env.GROQ_API_KEY || null, userId, userName };
        }

        console.log("---- [AI CONFIG] Company Found:", user.company.name);

        let config = user.company.apiConfig;
        if (!config) {
            console.warn("---- [AI CONFIG] Company has no apiConfig");
            return { apiKey: process.env.GROQ_API_KEY || null, userId, userName };
        }

        console.log("---- [AI CONFIG] Raw Config Type:", typeof config);

        // Handle stringified JSON if necessary
        if (typeof config === 'string') {
            try {
                config = JSON.parse(config);
                console.log("---- [AI CONFIG] Config Parsed from String");
            } catch (e) {
                console.error("---- [AI CONFIG] Failed to parse apiConfig string:", e);
                // If we can't parse it, we can't use it
                return { apiKey: process.env.GROQ_API_KEY || null, userId, userName };
            }
        }

        const typedConfig = config as any;
        console.log("---- [AI CONFIG] Config Keys:", Object.keys(typedConfig || {}));

        // Log the actual structure (masked) for debugging
        console.log("---- [AI CONFIG] Full Config Dump:", JSON.stringify(typedConfig, (key, value) => {
            if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
                return value ? `***${value.slice(-4)}` : null;
            }
            return value;
        }, 2));

        if (typedConfig?.groqKey) {
            try {
                const key = decrypt(typedConfig.groqKey);
                console.log("---- [AI CONFIG] Returning Decrypted DB Key");
                return { apiKey: key, userId, userName };
            } catch (e) {
                console.error("---- [AI CONFIG] Failed to decrypt Groq Key from Company config. Legacy unencrypted data?", e);
                // Fallback to the raw string if decryption fails
                return { apiKey: typedConfig.groqKey, userId, userName };
            }
        } else {
            console.warn("---- [AI CONFIG] 'groqKey' not found in config object");
        }

        return { apiKey: process.env.GROQ_API_KEY || null, userId, userName };

    } catch (error) {
        console.error("---- [AI CONFIG] Unexpected Error:", error);
        return { apiKey: process.env.GROQ_API_KEY || null, userId: null, userName: "Guest" };
    }
}
