import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.consultantProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ success: false, message: 'Profile not found' }, { status: 404 });

    const availabilities = await prisma.consultantAvailability.findMany({
      where: { consultantId: profile.id },
      orderBy: { dayOfWeek: 'asc' },
    });

    return NextResponse.json({ success: true, data: availabilities });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.consultantProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ success: false, message: 'Profile not found' }, { status: 404 });

    const body = await req.json(); // Expecting an array of availabilities

    await prisma.consultantAvailability.deleteMany({ where: { consultantId: profile.id } });

    const created = await prisma.consultantAvailability.createMany({
      data: body.map((a: any) => ({
        consultantId: profile.id,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isActive: a.isActive ?? true,
      })),
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
