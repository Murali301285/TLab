
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const page = parseInt(searchParams.get('page') || '1');
        const limitParam = searchParams.get('limit') || '10';
        const limit = limitParam === 'All' ? undefined : parseInt(limitParam);

        const search = searchParams.get('search') || '';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build Filter
        const where: Prisma.TokenUsageWhereInput = {};

        if (search) {
            where.OR = [
                { userName: { contains: search, mode: 'insensitive' } },
                { purpose: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            // End date should be end of that day if user selected a date
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        // Execute Query
        const [total, data] = await Promise.all([
            prisma.tokenUsage.count({ where }),
            prisma.tokenUsage.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: limit ? (page - 1) * limit : undefined,
                take: limit,
            })
        ]);

        // Get Chart Data (Aggregated by Date) for the filtered range
        // We'll fetch all matching records for the chart to ensure accuracy, 
        // or we could use groupBy if we want to optimize. 
        // Since groupBy doesn't support easy date truncation in Prisma without raw queries,
        // and data volume might not be huge yet, we can fetch lighter objects or use raw query.
        // For now, let's just fetch id, tokens, createdAt for the chart from the SAME filter but without pagination.

        // LIMITATION: If 'All' records are huge, this might be slow. 
        // Let's cap chart data fetch to 1000 records or use a separate raw query for aggregation if needed.
        // For MVP, we'll assume reasonable volume or just use the paginated data? 
        // No, user wants chart + table. Table finds 10, Chart needs context.
        // Let's use groupBy to get daily usage.

        // Prisma groupBy date isn't directly supported.
        // We will fetch specific fields for chart data.
        const chartDataRaw = await prisma.tokenUsage.findMany({
            where,
            select: {
                createdAt: true,
                tokens: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // aggregat in code
        const chartMap = new Map<string, number>();
        chartDataRaw.forEach(item => {
            const date = item.createdAt.toISOString().split('T')[0];
            const current = chartMap.get(date) || 0;
            chartMap.set(date, current + item.tokens);
        });

        const chartData = Array.from(chartMap.entries()).map(([date, tokens]) => ({
            date,
            tokens
        }));

        const totalTokensUsed = chartDataRaw.reduce((acc, curr) => acc + curr.tokens, 0);

        return NextResponse.json({
            data,
            meta: {
                total,
                page,
                limit: limit || total,
                totalPages: limit ? Math.ceil(total / limit) : 1
            },
            chartData,
            summary: {
                totalTokensUsed
            }
        });

    } catch (error) {
        console.error("Token Usage API Error", error);
        return NextResponse.json({ error: 'Failed to fetch token usage' }, { status: 500 });
    }
}
