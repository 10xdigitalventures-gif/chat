import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const items = await prisma.controlType.findMany({
      where: { controlTypeName: { contains: search } },
    });
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const item = await prisma.controlType.create({
      data: {
        controlTypeName: body.ControlTypeName,
        controlTypePrefix: body.ControlTypePrefix,
      },
    });
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
