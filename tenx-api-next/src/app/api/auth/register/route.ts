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
  if (!role) role = await prisma.appRole.create({ data: { roleName } });
  return role;
}

async function ensureLocation() {
  let locationType = await prisma.locationType.findFirst({
    where: { locationTypeName: 'Main' },
  });

  if (!locationType) {
    locationType = await prisma.locationType.create({
      data: {
        locationTypeName: 'Main',
        shortName: 'MAIN',
      },
    });
  }

  let location = await prisma.location.findFirst({
    where: { locationName: 'Head Office' },
  });

  if (!location) {
    location = await prisma.location.create({
      data: {
        locationName: 'Head Office',
        locationAddress: 'Main Office',
        isActive: true,
        locationTypeId: locationType.id,
      },
    });
  }

  return location;
}

async function ensureFiscalYear() {
  let fiscalYear = await prisma.fiscalYear.findFirst({
    where: { isCurrent: true, isActive: true },
  });

  if (!fiscalYear) {
    fiscalYear = await prisma.fiscalYear.findFirst({
      where: { name: 'FY 2026' },
    });
  }

  if (!fiscalYear) {
    fiscalYear = await prisma.fiscalYear.create({
      data: {
        name: 'FY 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        isActive: true,
        isCurrent: true,
      },
    });
  }

  return fiscalYear;
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
    const location = await ensureLocation();
    const fiscalYear = await ensureFiscalYear();
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
      locationId: location.id,
      connection: 'Production',
      fiscalYearId: fiscalYear.id,
    });

    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.userLoginPreference.upsert({
      where: { userId: user.id },
      update: {
        locationId: location.id,
        fiscalYearId: fiscalYear.id,
        connection: 'Production',
        rememberMe: true,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        locationId: location.id,
        fiscalYearId: fiscalYear.id,
        connection: 'Production',
        rememberMe: true,
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
