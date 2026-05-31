import { prisma } from '../prisma';
import { updateBalance } from './credits';
import crypto from 'crypto';

export const PayFastService = {
  verifySignature: (data: any) => {
    // In production, implement PayFast signature verification
    // See: https://developers.payfast.co.za/docs#signature_generation
    const passPhrase = process.env.PAYFAST_PASSPHRASE;
    if (!passPhrase) return true; // Skip if not configured (dev)

    // logic to reconstruct and hash the payload
    return true;
  },

  processWebhook: async (data: any) => {
    if (!PayFastService.verifySignature(data)) {
        return { success: false, message: 'Invalid signature' };
    }

    const { m_payment_id, pf_payment_id, payment_status, item_name, amount_gross } = data;

    if (payment_status !== 'COMPLETE') return { success: false, status: payment_status };

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionRef: m_payment_id },
      include: { user: true },
    });

    if (!transaction || transaction.status === 'Completed') {
      return { success: false, message: 'Transaction already processed or not found' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'Completed',
          updatedAt: new Date(),
        },
      });

      await updateBalance(transaction.userId, parseFloat(amount_gross), 'Credit', `Purchase via PayFast: ${item_name}`, transaction.id);

      await tx.invoice.create({
          data: {
              userId: transaction.userId,
              paymentId: transaction.id,
              invoiceNumber: `INV-${Date.now()}`,
              subTotal: parseFloat(amount_gross),
              tax: 0,
              total: parseFloat(amount_gross),
          }
      });
    });

    return { success: true };
  }
};

export const EasyPaisaService = {
    // Similar implementation for EasyPaisa
}
