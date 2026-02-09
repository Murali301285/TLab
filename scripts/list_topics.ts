
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listTopics() {
    const topics = await prisma.topic.findMany({
        select: { id: true, title: true, content: true }
    });
    console.log(`Found ${topics.length} topics:`);
    topics.forEach(t => {
        console.log(`- ID: ${t.id}, Title: ${t.title}, Content Length: ${t.content?.length}`);
    });
}

listTopics()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
