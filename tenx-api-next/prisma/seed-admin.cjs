const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  let role = await prisma.appRole.findFirst({
    where: { roleName: "Admin" }
  });

  if (!role) {
    role = await prisma.appRole.create({
      data: { roleName: "Admin" }
    });
  }

  const passwordHash = await bcrypt.hash("Admin@123", 10);

  await prisma.appUser.upsert({
    where: { email: "admin@tenx.com" },
    update: {
      passwordHash,
      isActive: true,
      roleId: role.id
    },
    create: {
      userName: "Admin",
      loginId: "admin",
      email: "admin@tenx.com",
      passwordHash,
      roleId: role.id,
      isActive: true
    }
  });

  console.log("Seed completed");
  console.log("Email: admin@tenx.com");
  console.log("Password: Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
