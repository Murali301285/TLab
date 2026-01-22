const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const course = await prisma.course.findFirst({
        where: { title: { contains: 'Change Your Day', mode: 'insensitive' } },
        include: { subCategory: true }
    });

    if (!course) {
        console.log("Course 'Change Your Day' not found.");
        return;
    }

    console.log("Current State:", {
        id: course.id,
        title: course.title,
        type: course.type,
        category: course.category,
        subCategory: course.subCategory?.name
    });

    if (course.type !== 'LIBRARY') {
        console.log("Updating type to LIBRARY...");
        const updated = await prisma.course.update({
            where: { id: course.id },
            data: { type: 'LIBRARY' }
        });
        console.log("Updated Type:", updated.type);
    } else {
        console.log("Already LIBRARY.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
