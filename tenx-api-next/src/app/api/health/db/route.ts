import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userCount = await prisma.appUser.count();
    const roleCount = await prisma.appRole.count();

    return NextResponse.json({
      success: true,
      database: 'connected',
      userCount,
      roleCount,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      },
    });
  } catch (error) {
    console.error('DB health error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Database health check failed',
        error: error instanceof Error ? error.message : String(error),
        env: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasJwtSecret: !!process.env.JWT_SECRET,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        },
      },
      { status: 500 }
    );
  }
}
