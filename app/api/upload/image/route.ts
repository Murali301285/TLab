
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validation
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB
            return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
        }

        // Ensure directory exists
        const cwd = process.cwd();
        console.log(`[Upload] CWD: ${cwd}`);

        const uploadDir = path.join(cwd, 'public/uploads');
        console.log(`[Upload] Target Dir: ${uploadDir}`);

        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Ignore if exists
        }

        // Unique filename: timestamp_sanitizedname.ext
        const ext = path.extname(file.name);
        const namePart = file.name.replace(ext, '').replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${Date.now()}_${namePart}${ext}`;
        const filepath = path.join(uploadDir, filename);

        // Convert to buffer and write
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Return URL and debug info
        const fileUrl = `/uploads/${filename}`;
        return NextResponse.json({ success: true, url: fileUrl, debugPath: filepath });

    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
