
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listTopicsWithCourse() {
    const topics = await prisma.topic.findMany({
        select: {
            id: true,
            title: true,
            content: true,
            chapter: {
                select: {
                    title: true,
                    course: {
                        select: {
                            title: true
                        }
                    }
                }
            }
        }
    });

    console.log(`Found ${topics.length} topics:`);
    topics.forEach(t => {
        const contentLen = t.content ? (t.content.length > 50 ? t.content.length : `SHORT(${t.content})`) : 'NULL';
        console.log(`[${t.chapter.course.title}] -> [${t.chapter.title}] -> [${t.title}] (ID: ${t.id}) :: Content: ${contentLen}`);
    });
}

listTopicsWithCourse()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
