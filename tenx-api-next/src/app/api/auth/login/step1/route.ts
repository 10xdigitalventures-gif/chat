import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const step1Schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = step1Schema.parse(body);

    const user = await prisma.appUser.findUnique({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Email not found.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        found: true,
        userName: user.userName,
        loginId: user.loginId,
        role: user.role?.roleName || '',
        locations: [],
        fiscalYears: [],
        connections: ['Production'],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.error('Login Step1 Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
