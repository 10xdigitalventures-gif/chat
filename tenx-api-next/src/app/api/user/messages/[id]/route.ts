import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const messages = await prisma.message.findMany({
      where: { conversationId: params.id },
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { sender: true },
    });

    return NextResponse.json({
      success: true,
      data: messages.map(m => ({
        messageId: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: m.sender.userName,
        body: m.body,
        messageType: m.messageType,
        sentAt: m.sentAt,
        isRead: m.isRead,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
