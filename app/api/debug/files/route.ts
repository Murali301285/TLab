
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const cwd = process.cwd();
        const publicUploads = path.join(cwd, 'public', 'uploads');

        let files: string[] = [];
        let error = null;

        if (fs.existsSync(publicUploads)) {
            files = fs.readdirSync(publicUploads);
        } else {
            error = "public/uploads directory does not exist";
        }

        return NextResponse.json({
            cwd,
            uploadDir: publicUploads,
            files: files.slice(0, 50), // List first 50
            totalFiles: files.length,
            exists: fs.existsSync(publicUploads),
            error
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
