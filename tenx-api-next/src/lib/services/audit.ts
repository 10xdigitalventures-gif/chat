import { prisma } from '../prisma';

export const auditLogger = async (
  userId: string | null,
  userName: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  details: string | null,
  ipAddress: string
) => {
  await prisma.auditLog.create({
    data: {
      userId,
      userName,
      action,
      entity,
      entityId,
      details,
      ipAddress,
    },
  });
};
