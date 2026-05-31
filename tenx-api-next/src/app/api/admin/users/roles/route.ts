import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const roles = await prisma.appRole.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { roleName } = await req.json();
    const role = await prisma.appRole.create({
      data: { roleName },
    });
    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
