import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password.' },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    const user = await prisma.appUser.findUnique({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role?.roleName || '',
    });

    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        user: {
          id: user.id,
          userName: user.userName,
          loginId: user.loginId,
          email: user.email,
          cellNo: user.cellNo,
          imageUrl: user.imageUrl,
          role: user.role?.roleName || '',
        },
      },
    });
  } catch (error) {
    console.error('Simple Login Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
