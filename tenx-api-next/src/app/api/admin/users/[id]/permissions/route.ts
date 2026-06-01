import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const permissions = await prisma.userPermission.findMany({
      where: { userId: params.id },
      include: { location: true },
    });
    return NextResponse.json({ success: true, data: permissions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await req.json(); // Array of permissions

    await prisma.userPermission.deleteMany({ where: { userId: params.id } });

    const created = await prisma.userPermission.createMany({
        data: body.map((p: any) => ({
            userId: params.id,
            locationId: p.locationId,
            permission: p.permission,
        }))
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
