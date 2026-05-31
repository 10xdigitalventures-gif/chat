import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.consultantProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!profile) return NextResponse.json({ success: false, message: 'Profile not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const profile = await prisma.consultantProfile.update({
      where: { userId },
      data: {
        bio: body.bio,
        specialization: body.specialization,
        experience: body.experience,
        hourlyRate: body.hourlyRate,
        timezone: body.timezone,
        avatarUrl: body.avatarUrl,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
