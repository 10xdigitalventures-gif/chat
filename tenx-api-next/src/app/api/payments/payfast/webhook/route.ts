import { NextResponse } from 'next/server';
import { PayFastService } from '@/lib/services/payments';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const data = Object.fromEntries(formData.entries());

    const result = await PayFastService.processWebhook(data);

    if (result.success) {
      return new NextResponse('OK', { status: 200 });
    } else {
      return new NextResponse('Error', { status: 400 });
    }
  } catch (error) {
    console.error('PayFast Webhook Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
