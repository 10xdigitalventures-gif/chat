import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendEmail } from '@/lib/services/notifications';

const emailTemplateSchema = z.object({
  name: z.string(),
  subject: z.string(),
  content: z.string(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where = {
      OR: [
        { name: { contains: search } },
        { subject: { contains: search } },
      ],
    };

    const [templates, total] = await Promise.all([
      prisma.emailTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.emailTemplate.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: templates,
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
    const validated = emailTemplateSchema.parse(body);

    const template = await prisma.emailTemplate.create({
      data: {
        name: validated.name,
        subject: validated.subject,
        content: validated.content,
      },
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 });
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
