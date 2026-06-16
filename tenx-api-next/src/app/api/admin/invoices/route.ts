import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';

    const where = {
      OR: [
        { invoiceNumber: { contains: search } },
        { user: { userName: { contains: search } } },
        { user: { email: { contains: search } } },
      ],
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: invoices,
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

export async function POST(req: Request) {
    // Logic for generating stats
    const totalRevenue = await prisma.invoice.aggregate({
        _sum: { total: true },
        where: { status: 'Paid' }
    });

    const totalInvoices = await prisma.invoice.count();

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonth = await prisma.invoice.aggregate({
        _sum: { total: true },
        where: {
            status: 'Paid',
            createdAt: { gte: firstDay }
        }
    });

    const uniqueBuyers = await prisma.invoice.groupBy({
        by: ['userId'],
    });

    return NextResponse.json({
        success: true,
        data: {
            totalRevenue: totalRevenue._sum.total || 0,
            totalInvoices,
            thisMonth: thisMonth._sum.total || 0,
            uniqueBuyers: uniqueBuyers.length
        }
    });
}
