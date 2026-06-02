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

  let locationType = await prisma.locationType.findFirst({
    where: { locationTypeName: "Main" }
  });

  if (!locationType) {
    locationType = await prisma.locationType.create({
      data: {
        locationTypeName: "Main",
        shortName: "MAIN"
      }
    });
  }

  let location = await prisma.location.findFirst({
    where: { locationName: "Head Office" }
  });

  if (!location) {
    location = await prisma.location.create({
      data: {
        locationName: "Head Office",
        locationAddress: "Main Office",
        isActive: true,
        locationTypeId: locationType.id
      }
    });
  }

  let fiscalYear = await prisma.fiscalYear.findFirst({
    where: { name: "FY 2026" }
  });

  if (!fiscalYear) {
    fiscalYear = await prisma.fiscalYear.create({
      data: {
        name: "FY 2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        isActive: true,
        isCurrent: true
      }
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
