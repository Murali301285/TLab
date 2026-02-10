import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const currencies = await prisma.currency.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(currencies);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch currencies' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const currency = await prisma.currency.create({
            data: {
                code: body.code,
                symbol: body.symbol,
                name: body.name,
                description: body.description,
                isActive: body.isActive ?? true
            }
        });
        return NextResponse.json(currency);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create currency' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const body = await req.json();
        const currency = await prisma.currency.update({
            where: { id },
            data: {
                code: body.code,
                symbol: body.symbol,
                name: body.name,
                description: body.description,
                isActive: body.isActive
            }
        });
        return NextResponse.json(currency);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update currency' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await prisma.currency.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete currency' }, { status: 500 });
    }
}
