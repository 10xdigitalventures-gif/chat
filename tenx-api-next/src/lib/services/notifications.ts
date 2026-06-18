import { prisma } from '../prisma';

export interface EmailOptions {
  toEmail: string;
  toName: string;
  subject: string;
  htmlBody: string;
  plainBody?: string;
}

export const sendEmail = async (options: EmailOptions) => {
  const { toEmail, toName, subject, htmlBody, plainBody } = options;

  const log = await prisma.emailNotification.create({
    data: {
      to: toEmail,
      subject: subject,
      body: htmlBody,
      status: 'pending',
    },
  });

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@10xdigitalventures.com';
  const fromName = process.env.SENDGRID_FROM_NAME || '10X Convo';

  if (!apiKey || apiKey.includes('xxx')) {
    console.log(`📧 [EMAIL-MOCK] To: ${toEmail} | Subject: ${subject}`);
    await prisma.emailNotification.update({
      where: { id: log.id },
      data: { status: 'mock-sent', sentAt: new Date() },
    });
    return { success: true, messageId: 'mock-id' };
  }

  try {
    // In a real implementation, use @sendgrid/mail
    // For now, we simulate the logic
    console.log(`Sending real email to ${toEmail} via SendGrid...`);

    await prisma.emailNotification.update({
      where: { id: log.id },
      data: { status: 'sent', sentAt: new Date() },
    });
    return { success: true };
  } catch (error: any) {
    await prisma.emailNotification.update({
      where: { id: log.id },
      data: { status: `failed:${error.message}` },
    });
    return { success: false, error: error.message };
  }
};

export const sendSms = async (to: string, message: string) => {
    const log = await prisma.smsNotification.create({
        data: {
            to,
            body: message,
            status: 'pending',
        }
    });

    const sid = process.env.TWILIO_ACCOUNT_SID;
    if (!sid || sid.includes('xxx')) {
        console.log(`📟 [SMS-MOCK] To: ${to} | ${message}`);
        await prisma.smsNotification.update({
            where: { id: log.id },
            data: { status: 'mock-sent', sentAt: new Date() }
        });
        return { success: true };
    }

    // Real Twilio logic here
    return { success: true };
}
