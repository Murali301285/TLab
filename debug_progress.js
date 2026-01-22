
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const userId = 'u1'; // Hardcoded in frontend
    const courseId = 'cmk2r7mo2000cwfkp5vokv3sd'; // From logs

    console.log(`Checking progress for User: ${userId}, Course: ${courseId}`);

    // 1. Check Course exists
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: { chapters: { include: { topics: true } } }
    });
    if (!course) {
        console.log("Course not found!");
        return;
    }
    console.log(`Course Found: ${course.title}`);

    // Get all topic IDs for this course
    const allTopicIds = course.chapters.flatMap(c => c.topics.map(t => t.id));
    console.log(`Total Topics in Course: ${allTopicIds.length}`);

    // 2. Check UserProgress
    const progress = await prisma.userProgress.findMany({
        where: {
            userId: userId,
            topicId: { in: allTopicIds }
        }
    });

    console.log(`Found ${progress.length} progress records.`);
    progress.forEach(p => {
        console.log(`- Topic: ${p.topicId}, Completed: ${p.completed}`);
    });

    if (progress.length === 0) {
        console.log("CONCLUSION: No progress saved in DB. Issue is in SAVE logic.");
    } else {
        console.log("CONCLUSION: Progress exists in DB. Issue is in FETCH/RESUME logic.");
    }
}

check()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
