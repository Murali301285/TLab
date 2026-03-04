import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, mode, config } = body;

        // Fallback Logic: Check if provided userId exists, if not, find ANY valid user to attach to
        // This is strictly for Development/Demo purposes where seeding might be inconsistent
        let validUserId = userId;

        const userExists = await prisma.user.findUnique({ where: { id: userId } });

        if (!userExists) {
            console.warn(`User ${userId} not found, falling back to first available user.`);
            const firstUser = await prisma.user.findFirst();
            if (firstUser) {
                validUserId = firstUser.id;
            } else {
                // If NO users exist, we can't create a session due to relation constraints.
                // You must seed the DB.
                return NextResponse.json({ error: "No users in database. Please seed users." }, { status: 400 });
            }
        }

        // Fetch User's Plan via Company
        const userWithPlan = await prisma.user.findUnique({
            where: { id: validUserId },
            include: {
                company: {
                    include: { plan: true }
                }
            }
        });

        // Determine Model based on Category and Plan Config
        let selectedModel = null;
        if (config && config.category && userWithPlan?.company?.plan?.coachConfig) {
            const planConfig = userWithPlan.company.plan.coachConfig as any;
            if (config.category === 'Regional') {
                selectedModel = planConfig.regionalModel;
            } else {
                selectedModel = planConfig.internationalModel;
            }
        }

        const finalConfig = {
            ...config,
            model: selectedModel // Inject the model from Plan
        };

        const session = await prisma.coachSession.create({
            data: {
                userId: validUserId,
                mode,
                config: finalConfig || {},
                startTime: new Date(),
            }
        });

        return NextResponse.json({ session });
    } catch (error) {
        console.error("Create Session Error", error);
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "Session ID required" }, { status: 400 });
        }

        const session = await prisma.coachSession.findUnique({ where: { id: sessionId } });
        if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

        const updated = await prisma.coachSession.update({
            where: { id: sessionId },
            data: {
                endTime,
                duration
            }
        });

        return NextResponse.json({ session: updated });
    } catch (error) {
        console.error("End Session Error", error);
        return NextResponse.json({ error: "Failed to end session" }, { status: 500 });
    }
}
