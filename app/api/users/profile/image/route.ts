import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file || !userId) {
            return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const filename = `${userId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const relativePath = `/uploads/profiles/${filename}`;
        const path = join(process.cwd(), 'public', 'uploads', 'profiles', filename);

        // Write file
        await writeFile(path, buffer);

        // Update User in DB
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { image: relativePath }
        });

        return NextResponse.json({ success: true, image: relativePath, user: updatedUser });

    } catch (error: any) {
        console.error("Profile upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
