import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const config = await prisma.clientSettings.findFirst();
    return NextResponse.json({ success: true, data: config });
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
    const config = await prisma.clientSettings.findFirst();

    let updated;
    if (config) {
      updated = await prisma.clientSettings.update({
        where: { id: config.id },
        data: { ...body, updatedAt: new Date() },
      });
    } else {
      updated = await prisma.clientSettings.create({
        data: { ...body },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
