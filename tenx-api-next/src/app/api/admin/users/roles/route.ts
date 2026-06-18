import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          roleName: {
            contains: search,
          },
        }
      : {};

    const totalRecords = await prisma.appRole.count({ where });

    const items = await prisma.appRole.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        createdOn: "asc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      success: true,
      data: {
        items,
        totalRecords,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { roleName } = await req.json();

    if (!roleName || !String(roleName).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Role name is required.",
        },
        { status: 400 }
      );
    }

    const cleanName = String(roleName).trim();

    const existing = await prisma.appRole.findFirst({
      where: {
        roleName: cleanName,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
      });
    }

    const role = await prisma.appRole.create({
      data: {
        roleName: cleanName,
      },
    });

    return NextResponse.json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
