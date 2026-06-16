import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const balance = await prisma.creditBalance.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        amount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: balance.id,
        userId: balance.userId,

        // New simplified value
        amount: balance.amount,

        // Backward-compatible values expected by frontend
        textCharsRemaining: Math.floor(balance.amount || 0),
        audioMinsRemaining: 0,
        videoMinsRemaining: 0,
        imageCreditsRemaining: 0,
        fileCreditsRemaining: 0,
        updatedAt: balance.updatedAt,
      },
    });
  } catch (error) {
    console.error('Credit balance error:', error);

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
