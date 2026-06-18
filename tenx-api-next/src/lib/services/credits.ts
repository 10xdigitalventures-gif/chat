import { prisma } from '../prisma';

export const updateBalance = async (userId: string, amount: number, type: 'Credit' | 'Debit', description: string, paymentId?: string) => {
  return await prisma.$transaction(async (tx) => {
    const balance = await tx.creditBalance.upsert({
      where: { userId },
      update: { amount: { increment: amount }, updatedAt: new Date() },
      create: { userId, amount, updatedAt: new Date() },
    });

    await tx.creditTransaction.create({
      data: {
        creditBalanceId: balance.id,
        amount,
        type,
        description,
        paymentId,
      },
    });

    return balance;
  });
};
