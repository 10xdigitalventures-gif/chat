const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getCanonicalRole(roleName) {
  let role = await prisma.appRole.findFirst({
    where: { roleName },
    orderBy: { createdOn: "asc" },
  });

  if (!role) {
    role = await prisma.appRole.create({
      data: { roleName },
    });
  }

  const duplicates = await prisma.appRole.findMany({
    where: {
      roleName,
      id: {
        not: role.id,
      },
    },
  });

  for (const duplicate of duplicates) {
    await prisma.appUser.updateMany({
      where: { roleId: duplicate.id },
      data: { roleId: role.id },
    });

    await prisma.appRole.delete({
      where: { id: duplicate.id },
    });
  }

  return role;
}

async function main() {
  const adminRole = await getCanonicalRole("Admin");
  const consultantRole = await getCanonicalRole("Consultant");
  const userRole = await getCanonicalRole("User");

  await prisma.appUser.updateMany({
    where: { email: "admin@tenx.com" },
    data: { roleId: adminRole.id, isActive: true },
  });

  await prisma.appUser.updateMany({
    where: {
      email: {
        in: ["consultant@tenx.com", "growth@tenx.com"],
      },
    },
    data: { roleId: consultantRole.id, isActive: true },
  });

  await prisma.appUser.updateMany({
    where: { email: "user@tenx.com" },
    data: { roleId: userRole.id, isActive: true },
  });

  const roles = await prisma.appRole.findMany({
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
    orderBy: {
      createdOn: "asc",
    },
  });

  console.log("Roles fixed successfully:");
  console.table(
    roles.map((r) => ({
      id: r.id,
      roleName: r.roleName,
      users: r._count.users,
    }))
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
