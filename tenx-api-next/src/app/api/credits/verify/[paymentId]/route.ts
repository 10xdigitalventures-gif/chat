import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const params = await props.params;
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: params.paymentId },
    });

    if (!transaction) {
      return NextResponse.json({ success: false, message: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        status: transaction.status,
        transactionRef: transaction.transactionRef,
        amount: transaction.amount,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
