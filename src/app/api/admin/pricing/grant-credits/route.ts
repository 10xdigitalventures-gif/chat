import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const adminUserId = req.headers.get('x-user-id');

    if (!adminUserId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();

    const userId = String(body.userId || '');
    const amount = Number(
      body.amount ??
      body.credits ??
      body.textCredits ??
      body.textChars ??
      body.textCharsRemaining ??
      0
    );

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId is required' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'amount/credits must be greater than zero' },
        { status: 400 }
      );
    }

    const balance = await prisma.creditBalance.upsert({
      where: { userId },
      update: {
        amount: { increment: amount },
      },
      create: {
        userId,
        amount,
      },
    });

    await prisma.creditTransaction.create({
      data: {
        creditBalanceId: balance.id,
        amount,
        type: 'Credit',
        description: body.description || body.reason || 'Admin gift credits',
      },
    });

    const updated = await prisma.creditBalance.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Credits granted successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Grant credits error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
