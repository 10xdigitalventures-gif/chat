import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';

    const profile = await prisma.consultantProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ success: false, message: 'Profile not found' }, { status: 404 });

    const where = {
      consultantId: profile.id,
      status: 'Accepted',
      customer: {
        user: {
          userName: { contains: search }
        }
      }
    };

    const [items, total] = await Promise.all([
      prisma.clientConnection.findMany({
        where,
        include: {
          customer: { include: { user: true } }
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.clientConnection.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map(c => ({
          id: c.id,
          userName: c.customer.user.userName,
          customerEmail: c.customer.user.email,
          connectedAt: c.createdAt,
          // Need to find conversationId
        })),
        totalRecords: total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
