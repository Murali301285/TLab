
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch subcategories (optionally filtered by categoryId)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    try {
        // Fetch all, just filter by category if provided.
        // We want to show inactive ones too in the admin list.
        const whereClause = categoryId ? { categoryId } : {};

        const subCategories = await prisma.subCategory.findMany({
            where: whereClause,
            include: { category: true },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(subCategories);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch subcategories' }, { status: 500 });
    }
}

// POST: Create
export async function POST(req: NextRequest) {
    try {
        const { name, categoryId, remarks } = await req.json();
        const subCategory = await prisma.subCategory.create({
            data: { name, categoryId, remarks }
        });
        return NextResponse.json(subCategory);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'SubCategory already exists in this category' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create subcategory' }, { status: 500 });
    }
}

// PATCH: Update
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, isActive, remarks } = body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (remarks !== undefined) updateData.remarks = remarks;

        const subCategory = await prisma.subCategory.update({
            where: { id },
            data: updateData
        });
        return NextResponse.json(subCategory);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
