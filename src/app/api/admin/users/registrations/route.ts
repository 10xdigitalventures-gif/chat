import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';

    const where = {
      OR: [
        { userName: { contains: search } },
        { email: { contains: search } },
        { loginId: { contains: search } },
      ],
    };

    const [users, total] = await Promise.all([
      prisma.appUser.findMany({
        where,
        include: { role: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.appUser.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: users.map(u => ({
          ...u,
          roleName: u.role?.roleName
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const hashedPassword = await bcrypt.hash(body.password, 11);

    const user = await prisma.appUser.create({
      data: {
        userName: body.userName,
        loginId: body.loginId,
        email: body.email,
        passwordHash: hashedPassword,
        cellNo: body.cellNo,
        roleId: body.roleId,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
