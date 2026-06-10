import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const [balance, totalInvoices, totalConnections] = await Promise.all([
      prisma.creditBalance.findUnique({ where: { userId } }),
      prisma.invoice.count({ where: { userId } }),
      prisma.clientConnection.count({ where: { customer: { userId } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        balance: balance?.amount || 0,
        totalInvoices,
        totalConnections,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
