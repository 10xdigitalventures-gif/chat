import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where = {
        userId,
        ...(unreadOnly ? { isRead: false } : {})
    };

    const [items, total, unreadCount] = await Promise.all([
      prisma.appNotificationTarget.findMany({
        where,
        include: { notification: true },
        orderBy: { notification: { createdAt: 'desc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.appNotificationTarget.count({ where }),
      prisma.appNotificationTarget.count({ where: { userId, isRead: false } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map(i => ({
            id: i.id,
            title: i.notification.title,
            body: i.notification.body,
            createdOn: i.notification.createdAt,
            isRead: i.isRead,
        })),
        totalRecords: total,
        unreadCount,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
