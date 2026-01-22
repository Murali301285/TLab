
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename } = await params;

        // Security: Prevent directory traversal
        const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');

        // Try to find the file in public/uploads (where we write them)
        // Note: Using process.cwd() as it's the root where 'public' likely resides in standard/standalone
        const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);

        console.log(`[Serve] Request: ${filename}, Path: ${filePath}`);

        if (!existsSync(filePath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        const fileBuffer = await readFile(filePath);

        // Determine content type
        let contentType = 'application/octet-stream';
        const ext = path.extname(safeFilename).toLowerCase();
        if (ext === '.png') contentType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        if (ext === '.gif') contentType = 'image/gif';
        if (ext === '.webp') contentType = 'image/webp';
        if (ext === '.pdf') contentType = 'application/pdf';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error("Serve error:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
