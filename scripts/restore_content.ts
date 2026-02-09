
import { PrismaClient } from '@prisma/client';
import { COURSES } from '../data/mockData';

const prisma = new PrismaClient();

async function restoreContent() {
    console.log('Restoring content for corrupted topics...');

    // Find the BATNA topic in mock data
    const course = COURSES.find(c => c.id === 'c1');
    const chapter = course?.chapters.find(ch => ch.id === 'ch1');
    const sourceTopic = chapter?.topics.find(t => t.id === 't2'); // BATNA

    if (sourceTopic && sourceTopic.content) {
        console.log(`Found valid SOURCE content for topic: ${sourceTopic.title} (Length: ${sourceTopic.content.text.length})`);

        // Find the corresponding topic in DB by Title
        // Note: Title might vary slightly if mock data changed, so we try "1.2 The BATNA Principle"
        const dbTopics = await prisma.topic.findMany({
            where: {
                title: {
                    contains: "BATNA"
                }
            }
        });

        if (dbTopics.length > 0) {
            for (const dbTopic of dbTopics) {
                console.log(`Updating DB Topic: ${dbTopic.title} (${dbTopic.id})`);
                await prisma.topic.update({
                    where: { id: dbTopic.id },
                    data: {
                        content: JSON.stringify(sourceTopic.content)
                    }
                });
                console.log(`SUCCESS: Restored content for ${dbTopic.id}`);
            }
        } else {
            console.error("Could not find any topic with 'BATNA' in title in the database.");
        }
    } else {
        console.error('Could not find source content in mock data.');
    }

    await prisma.$disconnect();
}

restoreContent()
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
