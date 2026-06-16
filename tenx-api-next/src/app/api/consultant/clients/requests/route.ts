import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.consultantProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ success: false, message: 'Profile not found' }, { status: 404 });

    const requests = await prisma.clientConnection.findMany({
      where: { consultantId: profile.id, status: 'Pending' },
      include: { customer: { include: { user: true } } },
    });

    return NextResponse.json({
      success: true,
      data: requests.map(r => ({
        id: r.id,
        customerName: r.customer.user.userName,
        customerEmail: r.customer.user.email,
        requestedAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
