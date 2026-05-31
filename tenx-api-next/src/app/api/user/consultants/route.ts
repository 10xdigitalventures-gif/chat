import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';

    const where = {
      isPublic: true,
      OR: [
        { specialization: { contains: search } },
        { bio: { contains: search } },
        { user: { userName: { contains: search } } },
      ],
    };

    const [consultants, total] = await Promise.all([
      prisma.consultantProfile.findMany({
        where,
        include: { user: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.consultantProfile.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: consultants.map(c => ({
        id: c.id,
        userId: c.userId,
        userName: c.user.userName,
        slug: c.slug,
        bio: c.bio,
        specialization: c.specialization,
        experience: c.experience,
        hourlyRate: c.hourlyRate,
        imageUrl: c.user.imageUrl || c.avatarUrl,
        isOnline: c.isOnline,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
