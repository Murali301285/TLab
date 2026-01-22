import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.userId as string;

        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId,
                completedAt: { not: null },
                certificateId: { not: null }
            },
            include: {
                certificate: true,
                course: {
                    select: { title: true }
                }
            },
            orderBy: { completedAt: 'desc' }
        });

        const formattedCertificates = enrollments.map(enrollment => ({
            id: enrollment.certificate!.id,
            enrollmentId: enrollment.id,
            name: enrollment.certificate!.name,
            courseName: enrollment.course.title,
            bannerImage: enrollment.certificate!.bannerImage,
            issuedOn: enrollment.completedAt,
            validityType: enrollment.certificate!.validityType,
            validityValue: enrollment.certificate!.validityValue,
            // Calculate expiry if applicable
            expiresAt: calculateExpiry(enrollment.completedAt!, enrollment.certificate!.validityType, enrollment.certificate!.validityValue)
        }));

        return NextResponse.json(formattedCertificates);
    } catch (error) {
        console.error('Fetch my certificates error:', error);
        return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
    }
}

function calculateExpiry(issuedDate: Date, type: string, value: number | null): Date | null {
    if (type === 'NA' || !value) return null;

    const expiry = new Date(issuedDate);
    if (type === 'DAYS') expiry.setDate(expiry.getDate() + value);
    if (type === 'MONTHS') expiry.setMonth(expiry.getMonth() + value);
    if (type === 'YEARS') expiry.setFullYear(expiry.getFullYear() + value);

    return expiry;
}
