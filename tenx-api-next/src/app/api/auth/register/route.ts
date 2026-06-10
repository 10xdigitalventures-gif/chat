import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';

const registerSchema = z.object({
  userName: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  cellNo: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  cityName: z.string().optional().nullable(),
});

async function ensureRole(roleName: string) {
  let role = await prisma.appRole.findFirst({ where: { roleName } });

  if (!role) {
    role = await prisma.appRole.create({ data: { roleName } });
  }

  return role;
}

function makeLoginId(email: string) {
  return email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 40);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    const email = validated.email.toLowerCase().trim();

    const existing = await prisma.appUser.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Email already registered.' },
        { status: 409 }
      );
    }

    const role = await ensureRole('User');
    const passwordHash = await bcrypt.hash(validated.password, 10);

    let loginId = makeLoginId(email);
    const sameLoginId = await prisma.appUser.findUnique({ where: { loginId } });
    if (sameLoginId) loginId = `${loginId}-${Date.now()}`;

    const user = await prisma.appUser.create({
      data: {
        userName: validated.userName.trim(),
        loginId,
        email,
        cellNo: validated.cellNo || null,
        passwordHash,
        roleId: role.id,
        isActive: true,
        customerProfile: {
          create: {
            companyName: validated.companyName || null,
            industry: validated.industry || null,
            cityName: validated.cityName || null,
            isActive: true,
          },
        },
        creditBalances: {
          create: {
            amount: 0,
          },
        },
      },
      include: {
        role: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role?.roleName || 'User',
    });

    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully.',
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
          role: user.role?.roleName || 'User',
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid registration data.', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Register Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
