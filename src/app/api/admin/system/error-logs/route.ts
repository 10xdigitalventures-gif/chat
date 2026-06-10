import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';

    const where = {
      OR: [
        { message: { contains: search } },
        { source: { contains: search } },
      ],
    };

    const [items, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.errorLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map(l => ({
            id: l.id,
            controllerName: l.source || 'Unknown',
            actionName: 'Action',
            code: 500,
            errorMessage: l.message,
            createdOn: l.createdAt,
            stackTrace: l.stackTrace,
            requestPath: l.source
        })),
        totalRecords: total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
