
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all active categories
export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(categories);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}

// POST: Create a new category
export async function POST(req: NextRequest) {
    try {
        const { name, remarks } = await req.json();
        const category = await prisma.category.create({
            data: { name, remarks }
        });
        return NextResponse.json(category);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
}

// PATCH: Update category (Name, Active, Remarks)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, isActive, remarks } = body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (remarks !== undefined) updateData.remarks = remarks;

        const category = await prisma.category.update({
            where: { id },
            data: updateData
        });
        return NextResponse.json(category);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }
}

// DELETE: Hard Delete (Optional, usually we use Soft Delete via PATCH)
export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();
        await prisma.category.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        // Fallback to Deactivate if foreign key constraint?
        // For now let's just allow hard delete if no relations or error.
        return NextResponse.json({ error: 'Failed to delete. It may be in use.' }, { status: 500 });
    }
}
