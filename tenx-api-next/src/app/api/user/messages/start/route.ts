import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    let consultantUserId = '';

    try {
      const body = await req.json();
      consultantUserId = String(body.consultantUserId || body.userId || '');
    } catch {
      const { searchParams } = new URL(req.url);
      consultantUserId = String(searchParams.get('consultantUserId') || '');
    }

    if (!consultantUserId) {
      return NextResponse.json(
        { success: false, message: 'Consultant user id is required' },
        { status: 400 }
      );
    }

    if (consultantUserId === userId) {
      return NextResponse.json(
        { success: false, message: 'You cannot start a chat with yourself' },
        { status: 400 }
      );
    }

    let customer = await prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!customer) {
      customer = await prisma.customerProfile.create({
        data: {
          userId,
          isActive: true,
        },
      });
    }

    const consultant = await prisma.consultantProfile.findUnique({
      where: { userId: consultantUserId },
      include: { user: true },
    });

    // Do NOT check consultant.isActive because current schema does not have it.
    if (!consultant || consultant.isPublic === false) {
      return NextResponse.json(
        {
          success: false,
          message: 'Consultant not found or not available',
          debug: {
            consultantUserId,
            found: !!consultant,
            isPublic: consultant?.isPublic ?? null,
          },
        },
        { status: 404 }
      );
    }

    let connection = await prisma.clientConnection.findFirst({
      where: {
        consultantId: consultant.id,
        customerId: customer.id,
      },
    });

    if (!connection) {
      connection = await prisma.clientConnection.create({
        data: {
          consultantId: consultant.id,
          customerId: customer.id,
          status: 'Accepted',
        },
      });
    } else if (connection.status !== 'Accepted') {
      connection = await prisma.clientConnection.update({
        where: { id: connection.id },
        data: { status: 'Accepted' },
      });
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        consultantId: consultant.id,
        customerId: customer.id,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          consultantId: consultant.id,
          customerId: customer.id,
          lastMessageAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Chat started',
      data: {
        conversationId: conversation.id,
        connectionId: connection.id,
        consultantUserId: consultant.userId,
        consultantName: consultant.user.userName,
      },
    });
  } catch (error) {
    console.error('Start chat error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}