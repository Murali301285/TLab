import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const isActive = searchParams.get('isActive');

        const whereClause = isActive ? { isActive: isActive === 'true' } : {};

        const certificates = await prisma.certificate.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(certificates);
    } catch (error) {
        console.error('Fetch certificates error:', error);
        return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const name = formData.get('name') as string;
        const validityType = formData.get('validityType') as string;
        const validityValue = formData.get('validityValue') ? parseInt(formData.get('validityValue') as string) : null;
        const remarks = formData.get('remarks') as string;
        const bannerImage = formData.get('bannerImage') as File | null;

        if (!name) {
            return NextResponse.json({ error: 'Certificate Name is required' }, { status: 400 });
        }

        // Check uniqueness
        const existing = await prisma.certificate.findUnique({ where: { name } });
        if (existing) {
            return NextResponse.json({ error: 'Certificate Name must be unique' }, { status: 400 });
        }

        let bannerPath = null;
        if (bannerImage) {
            // Validate file type
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(bannerImage.type)) {
                return NextResponse.json({ error: 'Invalid file type. Only PNG, JPEG, GIF allowed.' }, { status: 400 });
            }
            // Validate size (2MB)
            if (bannerImage.size > 2 * 1024 * 1024) {
                return NextResponse.json({ error: 'File size exceeds 2MB limit.' }, { status: 400 });
            }

            const bytes = await bannerImage.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'certificates');
            await mkdir(uploadDir, { recursive: true });

            const fileName = `${Date.now()}-${bannerImage.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = path.join(uploadDir, fileName);

            await writeFile(filePath, buffer);
            bannerPath = `/uploads/certificates/${fileName}`;
        }

        const certificate = await prisma.certificate.create({
            data: {
                name,
                validityType,
                validityValue,
                remarks,
                bannerImage: bannerPath,
                isActive: true
            }
        });

        return NextResponse.json(certificate);

    } catch (error) {
        console.error('Create certificate error:', error);
        return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 });
    }
}
