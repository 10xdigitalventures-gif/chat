import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || '';

  if (!key || key === 'sk_test_dummy' || key === 'sk_test_or_live_key') {
    return null;
  }

  return new Stripe(key, {
    apiVersion: '2025-12-17.clover',
  });
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const amount = Number(body.amount || 0);
    const currency = String(body.currency || 'usd').toLowerCase();
    const provider = String(body.provider || body.gateway || 'manual').toLowerCase();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Amount must be greater than zero' },
        { status: 400 }
      );
    }

    const payment = await prisma.paymentTransaction.create({
      data: {
        userId,
        amount,
        currency: currency.toUpperCase(),
        provider,
        status: provider === 'manual' ? 'Completed' : 'Pending',
        transactionRef: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
    });

    if (provider === 'stripe') {
      const stripe = getStripe();

      if (!stripe) {
        return NextResponse.json(
          {
            success: false,
            message: 'Stripe is not configured. Set STRIPE_SECRET_KEY.',
            data: { paymentId: payment.id },
          },
          { status: 400 }
        );
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_URL ||
        process.env.APP_URL ||
        'http://localhost:5000';

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: Math.round(amount * 100),
              product_data: {
                name: '10X Convo Credits',
              },
            },
          },
        ],
        success_url: `${baseUrl}/billing?success=true&paymentId=${payment.id}`,
        cancel_url: `${baseUrl}/billing?canceled=true&paymentId=${payment.id}`,
        metadata: {
          paymentId: payment.id,
          userId,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          paymentId: payment.id,
          checkoutUrl: session.url,
        },
      });
    }

    // Manual/dummy payment flow for development or non-card providers.
    return NextResponse.json({
      success: true,
      message: 'Payment created',
      data: {
        paymentId: payment.id,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error('Purchase credits error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
