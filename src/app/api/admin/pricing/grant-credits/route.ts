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

    const description =
      body.description ||
      body.reason ||
      'Admin gift credits';

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

    const user = await prisma.appUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const balance = await prisma.creditBalance.upsert({
      where: { userId },
      update: {
        amount: {
          increment: amount,
        },
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
        description,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Credits granted successfully',
      data: {
        userId,
        amount,
        balance: balance.amount + amount,
      },
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