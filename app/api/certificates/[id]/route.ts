import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const formData = await req.formData();

        const name = formData.get('name') as string;
        const validityType = formData.get('validityType') as string;
        const validityValue = formData.get('validityValue') ? parseInt(formData.get('validityValue') as string) : null;
        const remarks = formData.get('remarks') as string;
        const isActive = formData.get('isActive') === 'true';
        const bannerImage = formData.get('bannerImage') as File | null;
        const keepExistingImage = formData.get('keepExistingImage') === 'true';

        // Check if exists
        const existingCert = await prisma.certificate.findUnique({ where: { id } });
        if (!existingCert) {
            return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
        }

        // Check name uniqueness if changed
        if (name && name !== existingCert.name) {
            const nameExists = await prisma.certificate.findUnique({ where: { name } });
            if (nameExists) {
                return NextResponse.json({ error: 'Certificate Name must be unique' }, { status: 400 });
            }
        }

        let bannerPath = existingCert.bannerImage;

        if (bannerImage) {
            // Validate file type and size
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(bannerImage.type)) {
                return NextResponse.json({ error: 'Invalid file type. Only PNG, JPEG, GIF allowed.' }, { status: 400 });
            }
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

            // Optional: Delete old image if it exists and isn't used elsewhere (simplified: just keep it for now or could delete)
        } else if (!keepExistingImage && !bannerImage) {
            // If user explicitly removed image (logic depends on UI, assuming explicit removal if keepExistingImage is false and no file)
            // bannerPath = null; // Requirement says "no image uploaded then use default" logic in user view, but master can have null.
        }

        const updatedCert = await prisma.certificate.update({
            where: { id },
            data: {
                name,
                validityType,
                validityValue,
                remarks,
                isActive,
                bannerImage: bannerPath
            }
        });

        return NextResponse.json(updatedCert);

    } catch (error) {
        console.error('Update certificate error:', error);
        return NextResponse.json({ error: 'Failed to update certificate' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Constraint Check
        const enrollmentCount = await prisma.enrollment.count({
            where: { certificateId: id }
        });

        if (enrollmentCount > 0) {
            return NextResponse.json({
                error: `Cannot delete certificate. It is currently assigned to ${enrollmentCount} enrollments. Mark it as inactive instead.`
            }, { status: 400 });
        }

        await prisma.certificate.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete certificate error:', error);
        return NextResponse.json({ error: 'Failed to delete certificate' }, { status: 500 });
    }
}
