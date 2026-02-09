
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNullContent() {
    console.log('Fixing NULL/Empty content topics...');

    // Find topics with null or empty string
    const topics = await prisma.topic.findMany({
        where: {
            OR: [
                { content: "" },
                { content: "\"\"" },
                { content: "{}" }
            ]
        }
    });

    console.log(`Found ${topics.length} topics with missing content.`);

    const PLACEHOLDER_CONTENT = JSON.stringify({
        text: `
# Content Restored

This topic's content was found to be empty and has been temporarily restored with this placeholder.

**Please re-generate or update this content in the editor.**

## Why am I seeing this?
The original content was likely lost due to a synchronization issue. We have fixed the bug preventing future data loss.
        `
    });

    for (const t of topics) {
        console.log(`Restoring content for: ${t.title} (${t.id})`);
        await prisma.topic.update({
            where: { id: t.id },
            data: { content: PLACEHOLDER_CONTENT }
        });
    }

    console.log("All missing content restored with placeholder.");
    await prisma.$disconnect();
}

fixNullContent()
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
