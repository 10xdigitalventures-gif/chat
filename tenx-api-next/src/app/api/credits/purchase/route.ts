import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StripeService, PayFastService, EasyPaisaService, JazzCashService } from '@/lib/services/payments';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { textChars, audioMins, videoMins, imageCredits, fileCredits, consultantId } = body;

    const pricing = await prisma.messagePricing.findMany();
    const items = [];

    if (textChars > 0) {
        const p = pricing.find(x => x.messageType === 'text');
        if (p) items.push({ name: 'Text Credits', price: (Math.ceil(textChars / p.unitSize) * p.pricePerUnit) });
    }
    // Add other credits...

    if (items.length === 0) return NextResponse.json({ success: false, message: 'Select at least one credit type' }, { status: 400 });

    const { gateway } = body;

    if (gateway === 'stripe') {
        const session = await StripeService.createCheckoutSession(userId, items, consultantId);
        return NextResponse.json({
            success: true,
            data: {
                checkoutUrl: session.url,
                sessionId: session.id,
                gateway: 'stripe'
            },
        });
    }

    if (gateway === 'payfast') {
        const user = await prisma.appUser.findUnique({ where: { id: userId } });
        const html = await PayFastService.generatePaymentForm(
            `PAY-${Date.now()}`,
            `BASKET-${Date.now()}`,
            items.reduce((acc, curr) => acc + curr.price, 0),
            user?.email || '',
            consultantId
        );
        return NextResponse.json({
            success: true,
            data: {
                paymentFormHtml: html,
                gateway: 'payfast'
            }
        });
    }

    if (gateway === 'easypaisa') {
        const html = await EasyPaisaService.generateForm(
            `EP-${Date.now()}`,
            items.reduce((acc, curr) => acc + curr.price, 0),
            `${process.env.NEXT_PUBLIC_URL}/api/payments/easypaisa/callback`,
            consultantId
        );
        return NextResponse.json({
            success: true,
            data: {
                paymentFormHtml: html,
                gateway: 'easypaisa'
            }
        });
    }

    if (gateway === 'jazzcash') {
        const html = await JazzCashService.generateForm(
            `JC-${Date.now()}`,
            items.reduce((acc, curr) => acc + curr.price, 0),
            `${process.env.NEXT_PUBLIC_URL}/api/payments/jazzcash/callback`,
            consultantId
        );
        return NextResponse.json({
            success: true,
            data: {
                paymentFormHtml: html,
                gateway: 'jazzcash'
            }
        });
    }

    // Default to stripe if not specified
    const session = await StripeService.createCheckoutSession(userId, items, consultantId);
    return NextResponse.json({
        success: true,
        data: {
            checkoutUrl: session.url,
            sessionId: session.id,
            gateway: 'stripe'
        },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
