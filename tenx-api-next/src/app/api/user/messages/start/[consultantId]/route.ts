import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ consultantId: string }> },
) {
  try {
    const { consultantId } = await params; // await add karo

    const userId = req.headers.get("x-user-id");
    console.log("=== x-user-id header:", userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get customer profile
    const profile = await prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profile not found" },
        { status: 404 },
      );
    }

    // Check if conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        customerId: profile.id,
        consultantId,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        data: { conversationId: existing.id },
      });
    }

    // Check consultant exists
    const consultant = await prisma.consultantProfile.findUnique({
      where: { id: consultantId },
    });
    if (!consultant) {
      return NextResponse.json(
        { success: false, message: "Consultant not found" },
        { status: 404 },
      );
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        customerId: profile.id,
        consultantId,
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { conversationId: conversation.id },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
