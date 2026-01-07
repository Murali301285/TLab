
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, courseId, validityValue, validityUnit, hasCertificate, certName, certUrl } = body;

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

        const enrollment = await prisma.enrollment.create({
            data: {
                userId,
                courseId,
                validityValue: validityValue ? parseInt(validityValue) : null,
                validityUnit,
                expiresAt,
                hasCertificate: hasCertificate || false,
                certName,
                certUrl
            }
        });

        return NextResponse.json(enrollment);

    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'User is already enrolled in this course' }, { status: 409 });
        }
        console.error("Enrollment error", error);
        return NextResponse.json({ error: 'Failed to assign course' }, { status: 500 });
    }
}
