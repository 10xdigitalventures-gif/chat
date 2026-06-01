import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { refreshToken } = refreshSchema.parse(body);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken, isRevoked: false },
      include: { user: { include: { role: true } } },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return NextResponse.json({ success: false, message: 'Invalid or expired refresh token.' }, { status: 401 });
    }

    const pref = await prisma.userLoginPreference.findUnique({
      where: { userId: tokenRecord.userId },
    });

    const accessToken = generateAccessToken({
      userId: tokenRecord.user.id,
      role: tokenRecord.user.role?.roleName || '',
      locationId: pref?.locationId || undefined,
      connection: pref?.connection || 'Production',
      fiscalYearId: pref?.fiscalYearId || undefined,
    });

    const newRefreshToken = generateRefreshToken();

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Save new token
    await prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
