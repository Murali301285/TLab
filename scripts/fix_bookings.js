const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fixing orphaned bookings...');
    const mentors = await prisma.mentor.findMany({ select: { id: true } });
    const mentorIds = mentors.map(m => m.id);

    const bookings = await prisma.mentorBooking.findMany();
    for (const b of bookings) {
        if (!mentorIds.includes(b.mentorId)) {
            console.log(`Fixing booking ${b.id} pointing to invalid mentor ${b.mentorId}`);
            await prisma.mentorBooking.update({
                where: { id: b.id },
                data: { mentorId: 'M1' }
            });
        }
    }
    console.log('Done.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
