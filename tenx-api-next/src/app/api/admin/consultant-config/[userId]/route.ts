import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await props.params;
    const config = await prisma.consultantServiceConfig.findUnique({
      where: { consultantUserId: params.userId },
    });
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await props.params;
    const body = await req.json();

    const config = await prisma.consultantServiceConfig.upsert({
      where: { consultantUserId: params.userId },
      update: { ...body },
      create: { ...body, consultantUserId: params.userId },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
