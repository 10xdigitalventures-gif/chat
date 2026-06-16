import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const consultant = await prisma.consultantProfile.findUnique({ where: { userId } });
    if (!consultant) return NextResponse.json({ success: false, message: 'Consultant not found' }, { status: 404 });

    const [clients, pending, unread] = await Promise.all([
      prisma.clientConnection.count({ where: { consultantId: consultant.id, status: 'Accepted' } }),
      prisma.clientConnection.count({ where: { consultantId: consultant.id, status: 'Pending' } }),
      prisma.message.count({
        where: {
            conversation: { consultantId: consultant.id },
            isRead: false,
            NOT: { senderId: userId }
        }
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { clients, pending, unread },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
