import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const logoutSchema = z.object({
  refreshToken: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { refreshToken } = logoutSchema.parse(body);

    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });

    return NextResponse.json({ success: true, message: 'Logged out.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
