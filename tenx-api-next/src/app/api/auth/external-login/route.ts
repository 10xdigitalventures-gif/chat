import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const externalLoginSchema = z.object({
  provider: z.string(),
  idToken: z.string(), // Client must send the actual OAuth ID Token
  email: z.string().email(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional(),
  locationId: z.string().uuid().optional(),
  fiscalYearId: z.string().uuid().optional(),
  connection: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = externalLoginSchema.parse(body);

    // ── SECURITY NOTICE ──────────────────────────────────────────────────────
    // In a production environment, you MUST verify the 'idToken' with the
    // OAuth provider (Google/Microsoft) on the server side to prevent
    // account takeover via spoofed email claims.
    // ─────────────────────────────────────────────────────────────────────────

    // Placeholder for real verification logic:
    // const payload = await verifyOAuthToken(validated.provider, validated.idToken);
    // if (!payload || payload.email !== validated.email) throw new Error('Invalid token');

    const providerKey = `EXT-${validated.email}`; // Simplified for migration demo

    let extLogin = await prisma.externalLogin.findUnique({
      where: {
        provider_providerKey: {
          provider: validated.provider,
          providerKey: providerKey,
        },
      },
      include: { user: { include: { role: true } } },
    });

    let user;

    if (extLogin) {
      user = extLogin.user;
      if (!user.isActive) return NextResponse.json({ success: false, message: 'Account is disabled.' }, { status: 401 });
    } else {
      user = await prisma.appUser.findUnique({
        where: { email: validated.email.toLowerCase() },
        include: { role: true },
      });

      if (!user) {
        const clientRole = await prisma.appRole.findFirst({ where: { roleName: 'Client Role' } });
        user = await prisma.appUser.create({
          data: {
            userName: validated.displayName || validated.email.split('@')[0],
            loginId: validated.email,
            email: validated.email,
            passwordHash: await bcrypt.hash(Math.random().toString(36), 11),
            imageUrl: validated.avatarUrl,
            roleId: clientRole?.id,
            isActive: true,
          },
          include: { role: true },
        });
      }

      await prisma.externalLogin.create({
        data: {
          userId: user.id,
          provider: validated.provider,
          providerKey: providerKey,
          email: validated.email,
          displayName: validated.displayName,
          avatarUrl: validated.avatarUrl,
        },
      });
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role?.roleName || '',
      locationId: validated.locationId,
      connection: validated.connection || 'Production',
      fiscalYearId: validated.fiscalYearId,
    });

    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
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
          role: user.role?.roleName || '',
        },
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
