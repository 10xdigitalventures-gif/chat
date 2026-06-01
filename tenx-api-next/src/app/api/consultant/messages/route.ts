import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const profile = await prisma.consultantProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ success: false, message: 'Profile not found' }, { status: 404 });

    const conversations = await prisma.conversation.findMany({
      where: { consultantId: profile.id },
      include: {
        customer: { include: { user: true } },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      success: true,
      data: {
        items: conversations.map(c => ({
          conversationId: c.id,
          otherUserName: c.customer.user.userName,
          otherUserAvatar: c.customer.user.imageUrl || c.customer.avatarUrl,
          otherUserEmail: c.customer.user.email,
          lastMessage: c.messages[0]?.body || '',
          lastMessageAt: c.lastMessageAt,
          unreadCount: 0,
        })),
        totalRecords: conversations.length, // Simplified
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
