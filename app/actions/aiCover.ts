'use server';

import Replicate from 'replicate';
import sharp from 'sharp';

// Initialize Replicate
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateCoverImageAction(data: { title: string; theme: string }) {
    console.log("Generating cover for:", data.title, "Theme:", data.theme);

    if (!process.env.REPLICATE_API_TOKEN) {
        console.error("Missing REPLICATE_API_TOKEN");
        return {
            success: false,
            message: "Server missing Replicate API Token"
        };
    } else {
        console.log("REPLICATE_API_TOKEN is set (Length: " + process.env.REPLICATE_API_TOKEN.length + ")");
    }

    try {
        const prompt = `A high-quality, professional 3D style course cover image for a learning platform. 
        Topic: "${data.title}". 
        Style/Theme: ${data.theme}. 
        Aesthetic: Modern, clean, vibrant, educational, premium. 
        The image should be suitable for a course thumbnail. 
        No text on the image itself, just visual representation.`;

        // 1. Generate Image with Replicate (Flux-Schnell for speed)
        console.log("Calling Replicate...");
        const output = await replicate.run(
            "black-forest-labs/flux-schnell",
            {
                input: {
                    prompt: prompt,
                    go_fast: true,
                    megapixels: "1",
                    num_outputs: 1,
                    aspect_ratio: "16:9",
                    output_format: "png",
                    disable_safety_checker: true
                }
            }
        );
        console.log("Replicate Output:", output);

        // Replicate returns an array of output streams/URLs (usually ReadableStream or URL string)
        // Flux-Schnell usually returns a ReadableStream or a URL depending on the client version/setup.
        // The current Node.js client usually returns a list of URLs or streams.

        let imageUrl: string | null = null;
        if (Array.isArray(output) && output.length > 0) {
            // It might be a URL string or a stream
            imageUrl = String(output[0]); // Ensure it's a string
        } else if (typeof output === 'string') {
            imageUrl = output;
        }

        if (!imageUrl) {
            throw new Error("No image URL returned from Replicate. Output was: " + JSON.stringify(output));
        }

        console.log("Raw Image URL from Replicate:", imageUrl);

        // 2. Fetch the image to process it
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error("Failed to search image from Replicate URL");

        const arrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        // 3. Add "Author: TLab" Overlay using Sharp
        const width = 800; // Resize to standard width
        const height = 450;

        // Create SVG Overlay
        const svgOverlay = `
        <svg width="${width}" height="${height}">
            <style>
                .title { fill: white; font-size: 24px; font-family: sans-serif; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
                .bg { fill: rgba(0, 0, 0, 0.3); } 
            </style>
            <!-- Background pill for text -->
            <rect x="${width - 160}" y="${height - 40}" width="150" height="30" rx="15" class="bg" />
            <text x="${width - 85}" y="${height - 18}" text-anchor="middle" class="title" font-size="16">Author: TLab</text>
        </svg>
        `;

        const processedImageBuffer = await sharp(imageBuffer)
            .resize(width, height)
            .composite([
                {
                    input: Buffer.from(svgOverlay),
                    top: 0,
                    left: 0,
                },
            ])
            .png()
            .toBuffer();

        // 4. Convert to Base64 to return to client
        const base64Image = `data:image/png;base64,${processedImageBuffer.toString('base64')}`;

        return {
            success: true,
            url: base64Image,
            revisedPrompt: prompt
        };

    } catch (error: any) {
        console.error("AI Cover Generation Error Full:", error);
        return {
            success: false,
            message: "Failed: " + (error.message || "Unknown error")
        };
    }
}

const GRADIENT_THEMES: Record<string, [string, string]> = {
    'Sunset': ['#fa709a', '#fee140'],
    'Ocean': ['#4facfe', '#00f2fe'],
    'Berry': ['#a18cd1', '#fbc2eb'],
    'Midnight': ['#2b5876', '#4e4376'],
    'Sunrise': ['#ff9a9e', '#fecfef'],
    'Mint': ['#a8ff78', '#78ffd6'],
    'Lavender': ['#e6dee9', '#afc9ff'],
    'Fire': ['#f83600', '#f9d423']
};

const SOLID_THEMES: Record<string, string> = {
    'Blue': '#3b82f6',
    'Purple': '#8b5cf6',
    'Green': '#10b981',
    'Red': '#ef4444',
    'Orange': '#f97316',
    'Slate': '#475569',
    'Teal': '#14b8a6',
    'Pink': '#ec4899'
};

export async function generateDesignCoverAction(data: { title: string; theme: string; colors?: string[]; type: 'gradient' | 'solid'; author: string; year: string; fontColor?: string }) {
    console.log("Generating Design Cover:", data);

    try {
        const width = 800;
        const height = 450;
        const fontColor = data.fontColor || 'black';

        let bgElement = '';

        if (data.type === 'solid') {
            // Use provided color or fallback to theme/default
            const color = (data.colors && data.colors[0]) ? data.colors[0] : (SOLID_THEMES[data.theme] || SOLID_THEMES['Blue']);
            bgElement = `<rect width="100%" height="100%" fill="${color}" />`;
        } else {
            // Use provided colors or fallback to theme/default
            const themeColors = (data.colors && data.colors.length >= 2) ? data.colors : (GRADIENT_THEMES[data.theme] || GRADIENT_THEMES['Sunset']);
            bgElement = `
             <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${themeColors[0]};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${themeColors[1]};stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grad)" />`;
        }

        // Escape XML characters helper
        const escapeXml = (str: string) => str.replace(/[<>&"']/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '"': return '&quot;';
                case "'": return '&apos;';
                default: return c;
            }
        });

        // Robust Word Wrapping (Preserving Manual Newlines)
        // 1. Split by user-defined newlines first
        const manualLines = data.title.split('\n');
        let lines: string[] = [];

        manualLines.forEach(manualLine => {
            // 2. Wrap each manual line individually
            const words = manualLine.split(' ');
            let currentLine = '';

            words.forEach(word => {
                if ((currentLine.length + word.length + 1) > 22) { // Stricter limit (22)
                    if (currentLine) lines.push(currentLine.trim());
                    currentLine = word;
                } else {
                    currentLine += (currentLine ? ' ' : '') + word;
                }
            });
            if (currentLine) lines.push(currentLine.trim());
        });

        // Construct SVG Title Content
        let safeTitle = '';
        if (lines.length > 0) {
            safeTitle = escapeXml(lines[0]);
            for (let i = 1; i < lines.length; i++) {
                safeTitle += `<tspan x="50%" dy="1.2em">${escapeXml(lines[i])}</tspan>`;
            }
        }

        const safeAuthor = (data.author !== undefined ? data.author : '3Vidya').replace(/[<>&"']/g, '');
        const safeYear = (data.year !== undefined ? data.year : new Date().getFullYear().toString()).replace(/[<>&"']/g, '');

        const svgImage = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            ${bgElement}
            
            <!-- Title (Dynamic Centering) -->
            <text x="50%" y="${lines.length === 1 ? '45%' : lines.length === 2 ? '42%' : '38%'}" text-anchor="middle" fill="${fontColor}" font-family="serif" font-weight="bold" font-size="48" style="text-shadow: none;">
                ${safeTitle}
            </text>
            
            ${(safeAuthor && safeYear) ? `
            <!-- Separator Line -->
            <line x1="100" y1="360" x2="${width - 100}" y2="360" stroke="${fontColor}" stroke-width="2" stroke-opacity="0.8" />
            
            <!-- Footer Details -->
             <text x="50%" y="400" text-anchor="middle" fill="${fontColor}" font-family="serif" font-weight="normal" font-size="18">
                Author: ${safeAuthor}
            </text>
             <text x="50%" y="425" text-anchor="middle" fill="${fontColor}" font-family="serif" font-weight="normal" font-size="14" opacity="0.9">
                Published Year ${safeYear}
            </text>
            ` : ''}
        </svg>
        `;

        const buffer = await sharp(Buffer.from(svgImage))
            .png()
            .toBuffer();

        const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

        return {
            success: true,
            url: base64Image
        };

    } catch (error: any) {
        console.error("Design Generation Error:", error);
        return {
            success: false,
            message: "Failed to generate design: " + error.message
        };
    }
}
