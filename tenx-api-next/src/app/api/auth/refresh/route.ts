import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateAccessToken } from "@/lib/auth";

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { refreshToken } = refreshSchema.parse(body);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: {
        token: refreshToken,
        isRevoked: false,
      },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired refresh token." },
        { status: 401 }
      );
    }

    const accessToken = generateAccessToken({
      userId: tokenRecord.user.id,
      role: tokenRecord.user.role?.roleName || "",
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error("Refresh Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
