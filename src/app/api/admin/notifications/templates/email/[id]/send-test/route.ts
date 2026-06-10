import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/services/notifications';

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { testEmail, variables } = await req.json();

    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json({ success: false, message: 'Template not found' }, { status: 404 });
    }

    let body = template.content;
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        body = body.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
      });
    }

    const result = await sendEmail({
      toEmail: testEmail,
      toName: 'Test User',
      subject: template.subject,
      htmlBody: body,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
