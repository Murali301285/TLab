import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

// Helper to get current user from token
async function getCurrentUser(req: NextRequest) {
    const token = req.cookies.get('auth-token')?.value;
    // console.log("[API] getCurrentUser - Token present:", !!token);
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { id: string; email: string; role: string; companyId: string };
    } catch (e) {
        console.error("[API] getCurrentUser - Token verification failed:", e);
        return null;
    }
}

export async function GET(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user || !user.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view'); // 'team' or null

    const where: any = {
        companyId: user.companyId,
    };

    if (view === 'team') {
        if (user.role === 'HR') {
            // HR sees everyone except Super Admin
            where.role = { not: 'SUPER_ADMIN' };
        } else {
            // Managers/Heads see only their subordinates
            // where managers list contains current user's id
            where.managers = {
                some: {
                    id: user.id
                }
            };
        }
    } else {
        // Default Admin View (Configuration/User Management)
        // Usually Admins see everyone
        // You might want to exclude SUPER_ADMIN here too if viewing as Company Admin, but let's keep current behavior unless asked
    }

    try {
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                isActive: true,
                createdAt: true,
                isTempUser: true,
                validity: true,
                contactNumber: true,
                contactEmail: true,
                managers: { select: { id: true, name: true } },
                _count: { select: { enrollments: true, subordinates: true } },
                enrollments: {
                    where: { status: 'ACTIVE' },
                    select: {
                        courseId: true, // Needed for assignedCourses mapping
                        course: {
                            select: { type: true, isCompliance: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Process users to add content breakdown
        const detailedUsers = users.map(user => {
            const policyCount = user.enrollments.filter(e => e.course.isCompliance).length;
            const libraryCount = user.enrollments.filter(e => !e.course.isCompliance && e.course.type === 'LIBRARY').length;
            const contentCount = user.enrollments.filter(e => !e.course.isCompliance && e.course.type !== 'LIBRARY').length;

            // Debug first user
            // if (users.indexOf(user) === 0) {
            //     console.log(`[API] User ${user.name} Counts:`, { policyCount, libraryCount, contentCount, totalEnrollments: user.enrollments.length });
            // }

            // Destructure to remove enrollments from final output
            const { enrollments, ...userData } = user;

            return {
                ...userData,
                assignedCourses: enrollments.map(e => e.courseId), // Return list of assigned course IDs
                contentCounts: {
                    policy: policyCount,
                    library: libraryCount,
                    content: contentCount
                }
            };
        });

        return NextResponse.json(detailedUsers);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser(req);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.companyId) {
        return NextResponse.json({ error: 'Unauthorized - No Company' }, { status: 401 });
    }

    // Role check: Only Company Admin or Super Admin can create users
    if (user.role !== 'COMPANY_ADMIN' && user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, email, password, role, department, isTempUser, validity, contactNumber, contactEmail, managerIds } = body;

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check availability or existing user
        const existing = await prisma.user.findUnique({ where: { email } });

        let newUser;

        if (existing) {
            // If user exists, check if we can update (Same Company or Super Admin)
            if (user.role !== 'SUPER_ADMIN' && existing.companyId !== user.companyId) {
                return NextResponse.json({ error: 'Email already exists in another company' }, { status: 400 });
            }

            // Update existing user (Re-activate and update details)
            const updateData: any = {
                name,
                role: role || existing.role,
                department,
                isActive: true, // Auto-activate
                isTempUser: isTempUser !== undefined ? isTempUser : existing.isTempUser,
                validity: validity ? new Date(validity) : (validity === null ? null : existing.validity),
                contactNumber: contactNumber !== undefined ? contactNumber : existing.contactNumber,
                contactEmail: contactEmail !== undefined ? contactEmail : existing.contactEmail,
                managers: managerIds ? {
                    set: managerIds.map((id: string) => ({ id }))
                } : undefined
            };

            if (password) {
                updateData.password = await bcrypt.hash(password, 10);
            }

            newUser = await prisma.user.update({
                where: { id: existing.id },
                data: updateData
            });

        } else {
            const hashedPassword = await bcrypt.hash(password, 10);

            newUser = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: role || 'USER',
                    department,
                    companyId: user.companyId,
                    isActive: true,
                    isTempUser: isTempUser || false,
                    validity: validity ? new Date(validity) : null,
                    contactNumber,
                    contactEmail,
                    managers: managerIds && managerIds.length > 0 ? {
                        connect: managerIds.map((id: string) => ({ id }))
                    } : undefined
                },
            });
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;

        return NextResponse.json(userWithoutPassword);
    } catch (error) {
        console.error("Create user error:", error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user || !user.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'COMPANY_ADMIN' && user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id, name, role, department, isActive, password, isTempUser, validity, contactNumber, contactEmail, managerIds } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Verify user belongs to company
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser || targetUser.companyId !== user.companyId) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const data: any = {};
        if (name) data.name = name;
        if (role) data.role = role;
        if (department) data.department = department;
        if (typeof isActive === 'boolean') data.isActive = isActive;
        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        // New Fields
        if (typeof isTempUser === 'boolean') data.isTempUser = isTempUser;
        if (validity !== undefined) data.validity = validity ? new Date(validity) : null;
        if (contactNumber !== undefined) data.contactNumber = contactNumber;
        if (contactEmail !== undefined) data.contactEmail = contactEmail;

        if (managerIds) {
            data.managers = {
                set: managerIds.map((mid: string) => ({ id: mid }))
            };
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data,
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        return NextResponse.json(userWithoutPassword);
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user || !user.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'COMPANY_ADMIN' && user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Verify user belongs to company
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        if (user.role !== 'SUPER_ADMIN' && targetUser.companyId !== user.companyId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await prisma.user.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
