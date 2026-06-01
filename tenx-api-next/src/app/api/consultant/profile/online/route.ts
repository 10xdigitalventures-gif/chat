import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { isOnline } = await req.json();

    await prisma.consultantProfile.update({
      where: { userId },
      data: { isOnline },
    });

    return NextResponse.json({ success: true, message: `Status updated to ${isOnline ? 'Online' : 'Offline'}` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
