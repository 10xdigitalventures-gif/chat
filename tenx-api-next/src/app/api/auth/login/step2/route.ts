import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';

const step2Schema = z.object({
  email: z.string().email(),
  password: z.string(),
  locationId: z.string(),
  connection: z.string(),
  fiscalYearId: z.string(),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Login Step 2 Body:', body);

    const result = step2Schema.safeParse(body);
    if (!result.success) {
      console.error('Validation error:', JSON.stringify(result.error.errors, null, 2));
      return NextResponse.json({ success: false, message: 'Invalid request data', errors: result.error.errors }, { status: 400 });
    }

    const { email, password, locationId, connection, fiscalYearId, rememberMe } = result.data;

    const user = await prisma.appUser.findUnique({
      where: { email: email.toLowerCase(), isActive: true },
      include: { role: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { locationType: true },
    });

    if (!location) {
      return NextResponse.json({ success: false, message: 'Location not found.' }, { status: 400 });
    }

    const fiscalYear = await prisma.fiscalYear.findUnique({
      where: { id: fiscalYearId },
    });

    if (!fiscalYear) {
      return NextResponse.json({ success: false, message: 'Fiscal year not found.' }, { status: 400 });
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role?.roleName || '',
      locationId,
      connection,
      fiscalYearId,
    });

    const refreshToken = generateRefreshToken();

    // Revoke old tokens
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    // Save new refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Save login preference
    await prisma.userLoginPreference.upsert({
      where: { userId: user.id },
      update: {
        locationId,
        fiscalYearId,
        connection,
        rememberMe: !!rememberMe,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        locationId,
        fiscalYearId,
        connection,
        rememberMe: !!rememberMe,
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
    console.error('Login Step 2 Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
