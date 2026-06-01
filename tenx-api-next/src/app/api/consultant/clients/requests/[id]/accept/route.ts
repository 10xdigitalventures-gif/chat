import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const connection = await prisma.clientConnection.update({
      where: { id: params.id },
      data: { status: 'Accepted', updatedAt: new Date() },
    });

    // Automatically create a conversation
    await prisma.conversation.upsert({
      where: {
        id: `${connection.consultantId}_${connection.customerId}`, // Custom ID logic or handle in schema
      },
      update: {},
      create: {
        consultantId: connection.consultantId,
        customerId: connection.customerId,
      }
    } as any);

    return NextResponse.json({ success: true, message: 'Request accepted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
