const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function getRole(roleName) {
  let role = await prisma.appRole.findFirst({ where: { roleName } });
  if (!role) role = await prisma.appRole.create({ data: { roleName } });
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

  await createUser({
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

  const customerUser = await createUser({
    userName: "Demo User",
    loginId: "user",
    email: "user@tenx.com",
    password: "User@123",
    roleId: userRole.id
  });

  const consultantProfile = await prisma.consultantProfile.upsert({
    where: { userId: consultantUser.id },
    update: {
      slug: "demo-consultant",
      bio: "Business automation and growth consultant.",
      specialization: "Business Automation",
      experience: "5+ years",
      hourlyRate: 5000,
      timezone: "PKT",
      isOnline: true,
      isPublic: true
    },
    create: {
      userId: consultantUser.id,
      slug: "demo-consultant",
      bio: "Business automation and growth consultant.",
      specialization: "Business Automation",
      experience: "5+ years",
      hourlyRate: 5000,
      timezone: "PKT",
      isOnline: true,
      isPublic: true
    }
  });

  const customerProfile = await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {
      bio: "Demo customer account.",
      companyName: "Demo Company",
      industry: "Technology",
      cityName: "Karachi",
      isActive: true
    },
    create: {
      userId: customerUser.id,
      bio: "Demo customer account.",
      companyName: "Demo Company",
      industry: "Technology",
      cityName: "Karachi",
      isActive: true
    }
  });

  await prisma.creditBalance.upsert({
    where: { userId: customerUser.id },
    update: { amount: 10000 },
    create: {
      userId: customerUser.id,
      amount: 10000
    }
  });

  await prisma.consultantServiceConfig.upsert({
    where: { consultantUserId: consultantUser.id },
    update: {
      textRate: 100,
      audioRate: 500,
      videoRate: 1000,
      imageRate: 50,
      fileRate: 50,
      voiceEnabled: true,
      videoEnabled: true,
      payFastEnabled: true
    },
    create: {
      consultantUserId: consultantUser.id,
      textRate: 100,
      audioRate: 500,
      videoRate: 1000,
      imageRate: 50,
      fileRate: 50,
      voiceEnabled: true,
      videoEnabled: true,
      payFastEnabled: true
    }
  });

  await prisma.consultantAvailability.deleteMany({
    where: { consultantId: consultantProfile.id }
  });

  await prisma.consultantAvailability.createMany({
    data: [
      { consultantId: consultantProfile.id, dayOfWeek: 1, startTime: "10:00", endTime: "18:00", isActive: true },
      { consultantId: consultantProfile.id, dayOfWeek: 2, startTime: "10:00", endTime: "18:00", isActive: true },
      { consultantId: consultantProfile.id, dayOfWeek: 3, startTime: "10:00", endTime: "18:00", isActive: true }
    ]
  });

  let connection = await prisma.clientConnection.findFirst({
    where: {
      consultantId: consultantProfile.id,
      customerId: customerProfile.id
    }
  });

  if (!connection) {
    connection = await prisma.clientConnection.create({
      data: {
        consultantId: consultantProfile.id,
        customerId: customerProfile.id,
        status: "Accepted"
      }
    });
  } else {
    await prisma.clientConnection.update({
      where: { id: connection.id },
      data: { status: "Accepted" }
    });
  }

  let conversation = await prisma.conversation.findFirst({
    where: {
      consultantId: consultantProfile.id,
      customerId: customerProfile.id
    }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        consultantId: consultantProfile.id,
        customerId: customerProfile.id
      }
    });
  }

  const messageCount = await prisma.message.count({
    where: { conversationId: conversation.id }
  });

  if (messageCount === 0) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: customerUser.id,
        body: "Hi, I need help with business automation.",
        messageType: "text",
        isRead: false
      }
    });
  }

  console.log("Seed completed successfully.");
  console.log("");
  console.log("Admin Login:");
  console.log("Email: admin@tenx.com");
  console.log("Password: Admin@123");
  console.log("");
  console.log("Consultant Login:");
  console.log("Email: consultant@tenx.com");
  console.log("Password: Consultant@123");
  console.log("");
  console.log("User Login:");
  console.log("Email: user@tenx.com");
  console.log("Password: User@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
