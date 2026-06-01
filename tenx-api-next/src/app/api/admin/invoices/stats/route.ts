import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
