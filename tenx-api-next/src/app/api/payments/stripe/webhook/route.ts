import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Stripe webhook endpoint is available',
  });
}

export async function POST(req: Request) {
  try {
    let payload: unknown = null;

    try {
      payload = await req.json();
    } catch {
      payload = await req.text();
    }

    console.log('Stripe webhook received:', payload);

    return NextResponse.json({
      success: true,
      message: 'Stripe webhook received',
    });
  } catch (error) {
    console.error('Stripe webhook error:', error);

    return NextResponse.json(
      { success: false, message: 'Webhook error' },
      { status: 500 }
    );
  }
}