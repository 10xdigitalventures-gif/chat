const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function getRole(roleName) {
  let role = await prisma.appRole.findFirst({ where: { roleName } });

  if (!role) {
    role = await prisma.appRole.create({ data: { roleName } });
  }

  return role;
}

async function createUser({ userName, loginId, email, password, roleId }) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.appUser.upsert({
    where: { email },
    update: {
      userName,
      loginId,
      passwordHash,
      roleId,
      isActive: true
    },
    create: {
      userName,
      loginId,
      email,
      passwordHash,
      roleId,
      isActive: true
    }
  });
}

async function main() {
  const adminRole = await getRole("Admin");
  const consultantRole = await getRole("Consultant");
  const userRole = await getRole("User");

  const adminUser = await createUser({
    userName: "Admin",
    loginId: "admin",
    email: "admin@tenx.com",
    password: "Admin@123",
    roleId: adminRole.id
  });

  const consultantUser = await createUser({
    userName: "Demo Consultant",
    loginId: "consultant",
    email: "consultant@tenx.com",
    password: "Consultant@123",
    roleId: consultantRole.id
  });

  const growthConsultantUser = await createUser({
    userName: "Business Growth Expert",
    loginId: "growthconsultant",
    email: "growth@tenx.com",
    password: "Growth@123",
    roleId: consultantRole.id
  });

  const customerUser = await createUser({
    userName: "Demo User",
    loginId: "user",
    email: "user@tenx.com",
    password: "User@123",
    roleId: userRole.id
  });

  await prisma.consultantProfile.upsert({
    where: { userId: consultantUser.id },
    update: {
      slug: "demo-consultant",
      bio: "I help businesses improve CRM, automation, client communication, and sales workflows.",
      specialization: "Business Automation",
      experience: "5+ years",
      hourlyRate: 5000,
      timezone: "Asia/Karachi",
      isOnline: true,
      isPublic: true
    },
    create: {
      userId: consultantUser.id,
      slug: "demo-consultant",
      bio: "I help businesses improve CRM, automation, client communication, and sales workflows.",
      specialization: "Business Automation",
      experience: "5+ years",
      hourlyRate: 5000,
      timezone: "Asia/Karachi",
      isOnline: true,
      isPublic: true
    }
  });

  await prisma.consultantProfile.upsert({
    where: { userId: growthConsultantUser.id },
    update: {
      slug: "business-growth-expert",
      bio: "I help founders improve offers, funnels, client acquisition, and revenue systems.",
      specialization: "Marketing Strategy",
      experience: "7+ years",
      hourlyRate: 8000,
      timezone: "Asia/Karachi",
      isOnline: true,
      isPublic: true
    },
    create: {
      userId: growthConsultantUser.id,
      slug: "business-growth-expert",
      bio: "I help founders improve offers, funnels, client acquisition, and revenue systems.",
      specialization: "Marketing Strategy",
      experience: "7+ years",
      hourlyRate: 8000,
      timezone: "Asia/Karachi",
      isOnline: true,
      isPublic: true
    }
  });

  console.log("Seed completed.");
  console.log("");
  console.log("Admin: admin@tenx.com / Admin@123");
  console.log("Consultant: consultant@tenx.com / Consultant@123");
  console.log("Second Consultant: growth@tenx.com / Growth@123");
  console.log("User: user@tenx.com / User@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
