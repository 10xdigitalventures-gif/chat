import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();
    return NextResponse.json({ success: true, data: org });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const org = await prisma.organization.findFirst();

    let updated;
    if (org) {
      updated = await prisma.organization.update({
        where: { id: org.id },
        data: { ...body },
      });
    } else {
      updated = await prisma.organization.create({
        data: { ...body },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
