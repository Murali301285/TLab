const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MENTORS = [
    {
        id: 'M1',
        name: 'Prof CB Mohan',
        designation: 'Professor, Coach and Mentor',
        photoUrl: '/cb_mohan.png',
        organization: 'Gaaia3 Technologies & Ventures Private Limited',
        email: 'mohan.cb@gaaia3.com',
        bio: 'Global Professor and Leadership Coach specializing in Strategic Management and International Business. Helps corporate professionals reinvent themselves and startups build robust organizations. Taught over 7000 global managers globally.',
        expertise: ['Strategic Management', 'International Business', 'Leadership'],
        isTopMentor: true,
        isActive: true
    },
    {
        id: 'M2',
        name: 'Satish Anantharaman',
        designation: 'Management Consultant',
        photoUrl: '/satish_anantharaman.png',
        organization: 'Gaaia3 Technologies & Ventures Private Limited',
        email: 'satish.a@gaaia3.com',
        bio: 'An MBA with a strong engineering background and a track record of leading global engineering projects, supply chain management, and operations in high-tech environments.',
        expertise: ['Engineering Projects', 'Supply Chain Management', 'Tech Operations'],
        isTopMentor: true,
        isActive: true
    },
    {
        id: 'M3',
        name: 'Murali',
        designation: 'AI Consultant',
        photoUrl: '/murali.png',
        organization: 'Gaaia3 Technologies & Ventures Private Limited',
        email: 'murali.k@gaaia3.com',
        bio: '19+ Years of extensive IT experience predominantly in Architecture, Database design and BI. Proven expertise in Data Governance, Architecture and Security.',
        expertise: ['AI & Agents', 'Cloud Infrastructure', 'N8N Automation'],
        isTopMentor: true,
        isActive: true
    }
];

async function main() {
    console.log('Seeding Mentors...');
    for (const mentor of MENTORS) {
        await prisma.mentor.upsert({
            where: { id: mentor.id },
            update: mentor,
            create: mentor,
        });
    }
    console.log('Mentors Seeded.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
