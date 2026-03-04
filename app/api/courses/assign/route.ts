
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Use shared instance

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // console.log("[API] Assign Content Body:", body);
        const { userId, courseId, courseIds, validityValue, validityUnit, hasCertificate, certName, certUrl } = body;

        // Determine targets (support both single and multiple for flexibility)
        const targets = courseIds || (courseId ? [courseId] : []);

        if (targets.length === 0) {
            return NextResponse.json({ error: 'No content selected' }, { status: 400 });
        }

        // Calculate expiration date
        let expiresAt = null;
        if (validityValue && validityUnit) {
            const now = new Date();
            if (validityUnit === 'DAYS') {
                now.setDate(now.getDate() + parseInt(validityValue));
            } else if (validityUnit === 'YEARS') {
                now.setFullYear(now.getFullYear() + parseInt(validityValue));
            }
            expiresAt = now;
        }

        console.log(`[API] Assigning ${targets.length} items to User ${userId}`);

        // Use Promise.all to allow individual handling (e.g. skip duplicates) without failing the batch
        // $transaction requires raw Prisma Promises, but we want to catch errors individually.
        const results = await Promise.all(
            targets.map(async (cid: string) => {
                try {
                    return await prisma.enrollment.create({
                        data: {
                            userId,
                            courseId: cid,
                            validityValue: validityValue ? parseInt(validityValue) : null,
                            validityUnit,
                            expiresAt,
                            hasCertificate: hasCertificate || false,
                            certName,
                            certUrl,
                            certificateId: (body.certificateId && body.certificateId.trim() !== "") ? body.certificateId : null,
                            quizConfig: body.quizConfig || "5"
                        }
                    });
                } catch (err: any) {
                    // Ignore P2002 (Unique constraints) - User already enrolled
                    if (err.code === 'P2002') {
                        console.log(`[API] Skipping duplicate assignment: User ${userId}, Course ${cid}`);
                        return null;
                    }
                    console.error(`[API] Error assigning course ${cid}:`, err);
                    throw err; // Re-throw critical errors to fail the request (or could return null to allow partial)
                }
            })
        );

        const successes = results.filter(r => r !== null);

        return NextResponse.json({
            success: true,
            assigned: successes.length,
            totalRequested: targets.length
        });

    } catch (error: any) {
        console.error("Enrollment error detailed:", error);
        return NextResponse.json({ error: 'Failed to assign content', details: error.message }, { status: 500 });
    }
}
