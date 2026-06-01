import { prisma } from '../prisma';
import { updateBalance } from './credits';
import Stripe from 'stripe';
import axios from 'axios';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27' as any,
});

export const StripeService = {
  createCheckoutSession: async (userId: string, items: any[], consultantId?: string) => {
    let stripeAccount;
    if (consultantId) {
        const config = await prisma.consultantServiceConfig.findUnique({
            where: { consultantUserId: consultantId }
        });
        // Only use consultant's account if it's explicitly enabled and configured
        if (config?.stripeEnabled && config?.stripeAccountId) {
            stripeAccount = config.stripeAccountId;
        }
    }

    // Fallback: If stripeAccount is null, Stripe will use the platform's API key automatically.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: 1,
      })),
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/billing?canceled=true`,
      metadata: { userId, consultantId: consultantId || 'platform' },
    }, stripeAccount ? { stripeAccount } : undefined);

    return session;
  },

  processWebhook: async (event: Stripe.Event) => {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const amount = session.amount_total! / 100;

      if (userId) {
        await updateBalance(userId, amount, 'Credit', `Purchase via Stripe`, session.id);
      }
    }
  }
};

export const PayFastService = {
  getAccessToken: async (amount: number, basketId: string, consultantId?: string) => {
    let merchantId = process.env.PAYFAST_MERCHANT_ID;
    let securedKey = process.env.PAYFAST_SECURED_KEY;

    if (consultantId) {
        const config = await prisma.consultantServiceConfig.findUnique({
            where: { consultantUserId: consultantId }
        });
        if (config?.payFastEnabled && config?.payFastMerchantId && config?.payFastSecuredKey) {
            merchantId = config.payFastMerchantId;
            securedKey = config.payFastSecuredKey;
        }
    }

    const url = `${process.env.PAYFAST_BASE_URL}/Ecommerce/api/Transaction/GetAccessToken`;
    const data = new URLSearchParams();
    data.append('MERCHANT_ID', merchantId!);
    data.append('SECURED_KEY', securedKey!);
    data.append('TXNAMT', amount.toFixed(2));
    data.append('BASKET_ID', basketId);
    data.append('CURRENCY_CODE', 'PKR');

    try {
        const res = await axios.post(url, data);
        return (res.data as any).ACCESS_TOKEN;
    } catch (e) {
        console.error('PayFast Token Error:', e);
        return null;
    }
  },

  generatePaymentForm: async (paymentId: string, basketId: string, amount: number, customerEmail: string, consultantId?: string) => {
    const token = await PayFastService.getAccessToken(amount, basketId, consultantId);
    if (!token) return null;

    const fields = {
        MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID,
        TOKEN: token,
        TXNAMT: amount.toFixed(2),
        CUSTOMER_EMAIL_ADDRESS: customerEmail,
        BASKET_ID: basketId,
        CURRENCY_CODE: 'PKR',
    };

    let html = `<html><body onload="document.forms[0].submit()">`;
    html += `<form action="${process.env.PAYFAST_BASE_URL}/Ecommerce/api/Transaction/PostTransaction" method="post">`;
    Object.entries(fields).forEach(([k, v]) => {
        html += `<input type="hidden" name="${k}" value="${v}" />`;
    });
    html += `</form></body></html>`;
    return html;
  },

  processWebhook: async (data: any) => {
    const { basket_id, err_code, amount } = data;
    if (err_code !== '000') return { success: false };

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionRef: basket_id },
    });

    if (!transaction || transaction.status === 'Completed') return { success: false };

    await prisma.$transaction(async (tx) => {
        await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: 'Completed', updatedAt: new Date() }
        });
        await updateBalance(transaction.userId, parseFloat(amount), 'Credit', `PayFast Purchase`, transaction.id);
    });

    return { success: true };
  }
};

export const EasyPaisaService = {
    generateForm: async (orderRefNum: string, amount: number, postBackUrl: string, consultantId?: string) => {
        let hashKey = process.env.EASYPAISA_HASH_KEY || 'xxx';
        let storeId = process.env.EASYPAISA_STORE_ID || 'xxx';

        if (consultantId) {
            const config = await prisma.consultantServiceConfig.findUnique({
                where: { consultantUserId: consultantId }
            });
            if (config?.easyPaisaEnabled && config?.easyPaisaAccount) {
                // EasyPaisa configuration usually involves Store ID and Hash Key per merchant
                // For this migration, we assume the account field stores the necessary info or we use platform defaults
            }
        }

        const fields: any = {
            storeId,
            amount: amount.toFixed(2),
            postBackURL: postBackUrl,
            orderRefNum,
            autoRedirect: '0',
            paymentMethod: 'MA_PAYMENT',
            tran_type: 'IOP',
        };

        const sortedFields = Object.keys(fields).sort().map(k => `${k}=${fields[k]}`).join('&');

        let hash = 'mock-hash';
        try {
            const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(hashKey.substring(0, 16).padEnd(16)), null);
            hash = cipher.update(sortedFields, 'utf8', 'base64');
            hash += cipher.final('base64');
        } catch (e) {}

        fields.hash = hash;

        let html = `<html><body onload="document.forms[0].submit()">`;
        html += `<form action="https://easypay.easypaisa.com.pk/easypay/Index.jsf" method="post">`;
        Object.entries(fields).forEach(([k, v]) => {
            html += `<input type="hidden" name="${k}" value="${v}" />`;
        });
        html += `</form></body></html>`;
        return html;
    }
}

export const JazzCashService = {
    generateForm: async (orderRefNum: string, amount: number, postBackUrl: string, consultantId?: string) => {
        let merchantId = process.env.JAZZCASH_MERCHANT_ID || 'xxx';

        if (consultantId) {
            const config = await prisma.consultantServiceConfig.findUnique({
                where: { consultantUserId: consultantId }
            });
            if (config?.jazzCashEnabled && config?.jazzCashAccount) {
                merchantId = config.jazzCashAccount;
            }
        }

        const fields: any = {
            pp_MerchantID: merchantId,
            pp_Amount: Math.round(amount * 100),
            pp_TxnRefNo: orderRefNum,
            pp_ReturnURL: postBackUrl,
        };
        // Add more JC fields and hashing
        let html = `<html><body onload="document.forms[0].submit()">`;
        html += `<form action="https://sandbox.jazzcash.com.pk/CustomerPortal/transactionPage" method="post">`;
        Object.entries(fields).forEach(([k, v]) => {
            html += `<input type="hidden" name="${k}" value="${v}" />`;
        });
        html += `</form></body></html>`;
        return html;
    }
}
