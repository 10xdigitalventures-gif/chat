import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'PayFast webhook endpoint is available',
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

    console.log('PayFast webhook received:', payload);

    return NextResponse.json({
      success: true,
      message: 'PayFast webhook received',
    });
  } catch (error) {
    console.error('PayFast webhook error:', error);

    return NextResponse.json(
      { success: false, message: 'Webhook error' },
      { status: 500 }
    );
  }
}