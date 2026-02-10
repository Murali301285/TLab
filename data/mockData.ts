export interface Topic {
    id: string;
    title: string;
    type: 'text' | 'video' | 'quiz';
    isCompleted: boolean;
    content?: {
        text: string;
        summary: string;
        points: string[];
        quiz: { question: string; options: string[]; correct: number }[];
        mindMap: string;
    };
}

export interface Chapter {
    id: string;
    title: string;
    topics: Topic[];
}

export interface Course {
    id: string;
    title: string;
    category: string;
    progress: number;
    totalModules: number;
    thumbnail: string;
    chapters: Chapter[];
}

export const COURSES: Course[] = [
    {
        id: 'c1',
        title: 'Corporate Sales Playbook 2025',
        category: 'Sales',
        progress: 15,
        totalModules: 12,
        thumbnail: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
        chapters: [
            {
                id: 'ch1',
                title: 'Chapter 1: The Art of Negotiation',
                topics: [
                    {
                        id: 't1',
                        title: '1.1 Understanding Client Needs',
                        type: 'text',
                        isCompleted: true,
                    },
                    {
                        id: 't2',
                        title: '1.2 The BATNA Principle',
                        type: 'text',
                        isCompleted: false,
                        content: {
                            text: `
                <div class="prose prose-invert max-w-none">
                  <h1 class="text-3xl font-bold text-white mb-4">The BATNA Principle</h1>
                  <p class="text-lg text-slate-300 mb-6">
                    <strong class="text-cyan-400">BATNA</strong> stands for <strong>Best Alternative to a Negotiated Agreement</strong>. 
                    It is defined as the most advantageous alternative that a negotiating party can take if negotiations fail and an agreement cannot be reached.
                  </p>

                  <div class="bg-slate-800/50 border-l-4 border-cyan-500 p-4 mb-8 rounded-r-lg">
                    <h3 class="text-xl font-semibold text-white mb-2">Why is BATNA Important?</h3>
                    <p class="text-slate-400">
                      In any negotiation, your power is derived from your alternatives. If you have a strong BATNA, you can negotiate with confidence. 
                      If your BATNA is weak, you are desperate for a deal.
                    </p>
                  </div>

                  <h3 class="text-2xl font-bold text-white mb-4">Key Steps to Determine BATNA:</h3>
                  <ul class="list-disc pl-6 space-y-2 text-slate-300 mb-8">
                    <li><strong class="text-white">List your alternatives:</strong> What will you do if this deal falls through?</li>
                    <li><strong class="text-white">Evaluate them:</strong> Which one is the best?</li>
                    <li><strong class="text-white">Calculate your Reservation Value:</strong> The lowest deal you are willing to accept.</li>
                  </ul>

                  <blockquote class="text-2xl font-serif italic text-slate-400 border-l-4 border-slate-600 pl-4 mb-8">
                    "He who has the best alternative has the most power."
                  </blockquote>

                  <h3 class="text-2xl font-bold text-white mb-4">Examples</h3>
                  <p class="text-slate-300 mb-4">Imagine you are selling a car for $10,000.</p>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-green-900/20 border border-green-500/30 p-4 rounded-lg">
                      <h4 class="font-bold text-green-400 mb-2">Scenario A: Strong BATNA</h4>
                      <p class="text-sm text-slate-300">You have another offer for $9,500. This is your BATNA. You will not accept less than $9,500.</p>
                    </div>
                    <div class="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
                      <h4 class="font-bold text-red-400 mb-2">Scenario B: Weak BATNA</h4>
                      <p class="text-sm text-slate-300">You have no other offers and need cash. Your BATNA is keeping the car (value $0 in cash). You might accept $5,000.</p>
                    </div>
                  </div>
                </div>
              `,
                            summary: "BATNA (Best Alternative to a Negotiated Agreement) is your safety net. It determines your negotiating power. Always know your BATNA before entering a meeting to avoid accepting unfavorable terms.",
                            points: [
                                "BATNA = Best Alternative to a Negotiated Agreement.",
                                "It dictates your 'Walk Away' price.",
                                "Strong BATNA = High Negotiating Power.",
                                "Never reveal your BATNA to the other side unless it's strategic."
                            ],
                            quiz: [
                                {
                                    question: "What does BATNA stand for?",
                                    options: [
                                        "Best Alternative to a Negotiated Agreement",
                                        "Better Agreement to Negotiate Assets",
                                        "Business Analysis of Total Net Assets"
                                    ],
                                    correct: 0
                                },
                                {
                                    question: "If your BATNA is strong, you should:",
                                    options: [
                                        "Accept any deal",
                                        "Negotiate with confidence",
                                        "Cancel the meeting"
                                    ],
                                    correct: 1
                                }
                            ],
                            mindMap: `
graph TD
  A[Start Negotiation] --> B{Do you have a BATNA?}
  B -- Yes --> C[Evaluate Strength]
  B -- No --> D[Create Alternatives]
  D --> C
  C -- Strong --> E[Negotiate Aggressively]
  C -- Weak --> F[Improve BATNA]
  E --> G{Offer > BATNA?}
  G -- Yes --> H[Accept Deal]
  G -- No --> I[Walk Away]
              `
                        }
                    },
                    {
                        id: 't3',
                        title: '1.3 Closing Techniques',
                        type: 'text',
                        isCompleted: false,
                    }
                ]
            },
            {
                id: 'ch2',
                title: 'Chapter 2: Objection Handling',
                topics: [
                    { id: 't4', title: '2.1 The L.A.R.C Method', type: 'text', isCompleted: false }
                ]
            }
        ]
    },
    {
        id: 'c2',
        title: 'Cybersecurity Awareness',
        category: 'IT Security',
        progress: 0,
        totalModules: 5,
        thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80',
        chapters: []
    },
    {
        id: 'c3',
        title: 'HR Policy: Remote Work',
        category: 'HR',
        progress: 80,
        totalModules: 2,
        thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
        chapters: []
    }
];

export interface Role {
    id: string;
    name: string;
    description: string;
    canManageOthers: boolean;
    permissions: string[];
}

export const ROLES: Role[] = [
    {
        id: 'admin',
        name: 'Admin',
        description: 'Full system access',
        canManageOthers: true,
        permissions: ['all']
    },
    {
        id: 'hr',
        name: 'HR',
        description: 'Manage users and policies',
        canManageOthers: false, // In this model, HR manages policies, distinct from "Team Manager"
        permissions: ['view_all_users', 'manage_onboarding']
    },
    {
        id: 'manager',
        name: 'Manager',
        description: 'Manage team and assignments',
        canManageOthers: true,
        permissions: ['view_team', 'assign_courses']
    },
    {
        id: 'employee',
        name: 'Employee',
        description: 'Regular user access',
        canManageOthers: false,
        permissions: ['view_own_profile']
    }
];

export interface User {
    id: string;
    name: string;
    email: string;
    role: string; // references Role.id
    department: string;
    status: 'active' | 'inactive';
    managerId?: string; // ID of the user they report to
    assignedCourses: string[]; // Course IDs
    libraryItems: string[]; // Book IDs
}

export const USERS: User[] = [
    {
        id: 'u4',
        name: 'Diana Prince',
        email: 'diana@3vidya.com',
        role: 'admin',
        department: 'Operations',
        status: 'active',
        assignedCourses: ['c1', 'c2', 'c3'],
        libraryItems: ['b1', 'b2', 'b4']
    },
    {
        id: 'u1',
        name: 'Alice Johnson',
        email: 'alice@3vidya.com',
        role: 'manager',
        department: 'Sales',
        status: 'active',
        managerId: 'u4', // Reports to Diana
        assignedCourses: ['c1'],
        libraryItems: ['b1']
    },
    {
        id: 'u2',
        name: 'Bob Smith',
        email: 'bob@3vidya.com',
        role: 'employee',
        department: 'Sales',
        status: 'active',
        managerId: 'u1', // Reports to Alice
        assignedCourses: ['c2'],
        libraryItems: ['b3']
    },
    {
        id: 'u3',
        name: 'Charlie Brown',
        email: 'charlie@3vidya.com',
        role: 'employee',
        department: 'Sales', // Changed to Sales to group with Alice for demo
        status: 'inactive',
        managerId: 'u1', // Reports to Alice
        assignedCourses: [],
        libraryItems: []
    },
    {
        id: 'u5',
        name: 'Eve Polastri',
        email: 'eve@3vidya.com',
        role: 'manager',
        department: 'Engineering',
        status: 'active',
        managerId: 'u4', // Reports to Diana
        assignedCourses: ['c2', 'c3'],
        libraryItems: ['b3']
    },
    {
        id: 'u6',
        name: 'Frank Castle',
        email: 'frank@3vidya.com',
        role: 'employee',
        department: 'Engineering',
        status: 'active',
        managerId: 'u5', // Reports to Eve
        assignedCourses: ['c2'],
        libraryItems: []
    }
];

export interface Mentor {
    id: string;
    name: string;
    role: string;
    company: string;
    expertise: string[];
    bio: string;
    availability: string;
    image: string;
    rating: number;
}

export const MENTORS: Mentor[] = [
    {
        id: 'm1',
        name: 'Dr. Sarah Chen',
        role: 'Senior Data Scientist',
        company: 'TechCorp AI',
        expertise: ['Machine Learning', 'Python', 'Data Strategy'],
        bio: 'Ph.D. in Computer Science with 10+ years of experience in building scalable AI systems. Passionate about mentoring upcoming data scientists.',
        availability: 'Mon, Wed, Fri (Morning)',
        image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
        rating: 4.9
    },
    {
        id: 'm2',
        name: 'James Wilson',
        role: 'VP of Sales',
        company: 'Global Growth Inc.',
        expertise: ['B2B Sales', 'Negotiation', 'Team Leadership'],
        bio: 'Veteran sales leader who has closed over $50M in enterprise deals. Expert in the BATNA principle and strategic negotiation.',
        availability: 'Tue, Thu (Afternoon)',
        image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
        rating: 4.8
    },
    {
        id: 'm3',
        name: 'Elena Rodriguez',
        role: 'Chief HR Officer',
        company: 'PeopleFirst',
        expertise: ['HR Policy', 'Conflict Resolution', 'Career Development'],
        bio: 'Specializes in creating inclusive workplace cultures and helping professionals navigate their career paths.',
        availability: 'Weekends',
        image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
        rating: 5.0
    },
    {
        id: 'm4',
        name: 'Michael Chang',
        role: 'Cybersecurity Consultant',
        company: 'SecureNet',
        expertise: ['Network Security', 'Ethical Hacking', 'Compliance'],
        bio: 'Certified ethical hacker helping organizations secure their digital assets. Teaches practical cybersecurity awareness.',
        availability: 'Mon - Fri (Evening)',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
        rating: 4.7
    }
];

export interface Book {
    id: string;
    title: string;
    author: string;
    category: string;
    cover: string;
    description: string;
    readTime: string;
}

export const BOOKS: Book[] = [
    {
        id: 'b1',
        title: 'The Lean Startup',
        author: 'Eric Ries',
        category: 'Business',
        cover: 'https://images.unsplash.com/photo-1569516449771-41c4e9e7558d?w=400&q=80',
        description: 'How Today\'s Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses.',
        readTime: '4h 30m'
    },
    {
        id: 'b2',
        title: 'Atomic Habits',
        author: 'James Clear',
        category: 'Self-Help',
        cover: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80',
        description: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones.',
        readTime: '3h 45m'
    },
    {
        id: 'b3',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        category: 'Engineering',
        cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80',
        description: 'A Handbook of Agile Software Craftsmanship.',
        readTime: '6h 15m'
    },
    {
        id: 'b4',
        title: 'Zero to One',
        author: 'Peter Thiel',
        category: 'Business',
        cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80',
        description: 'Notes on Startups, or How to Build the Future.',
        readTime: '3h 20m'
    }
];
