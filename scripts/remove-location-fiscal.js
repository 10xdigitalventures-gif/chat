const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8')
}

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
    console.log('Removed', dir)
  }
}

function removeFile(file) {
  if (fs.existsSync(file)) {
    fs.rmSync(file, { force: true })
    console.log('Removed', file)
  }
}

function removeModel(schema, modelName) {
  const re = new RegExp(`\\n?model ${modelName} \\{[\\s\\S]*?\\n\\}\\n?`, 'g')
  return schema.replace(re, '\n')
}

/* -------------------------------------------------------------------------- */
/* Prisma schema cleanup                                                       */
/* -------------------------------------------------------------------------- */

const schemaPath = 'tenx-api-next/prisma/schema.prisma'
let schema = read(schemaPath)

schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"')

// Remove auth login preferences + location/fiscal tables
schema = removeModel(schema, 'UserLoginPreference')
schema = removeModel(schema, 'FiscalYear')
schema = removeModel(schema, 'LocationType')
schema = removeModel(schema, 'Location')

// Remove AppUser loginPreferences relation if present
schema = schema.replace(/\n\s*loginPreferences\s+UserLoginPreference\[\]/g, '')

// Remove location relations/scalars from role/menu/permissions
schema = schema.replace(/\n\s*locationId\s+String\??/g, '')
schema = schema.replace(/\n\s*location\s+Location\??\s+@relation[^\n]*/g, '')
schema = schema.replace(/\n\s*locations\s+Location\[\]/g, '')
schema = schema.replace(/\n\s*loginPreferences\s+UserLoginPreference\[\]/g, '')
schema = schema.replace(/\n\s*roleModules\s+RoleModule\[\]/g, '')
schema = schema.replace(/\n\s*roleMenus\s+RoleMenuEntry\[\]/g, '')
schema = schema.replace(/\n\s*userPermissions\s+UserPermission\[\]/g, '')

// Clean extra blank lines
schema = schema.replace(/\n{3,}/g, '\n\n')

write(schemaPath, schema)

/* -------------------------------------------------------------------------- */
/* Backend auth routes                                                         */
/* -------------------------------------------------------------------------- */

write('tenx-api-next/src/app/api/auth/login/step1/route.ts', `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const step1Schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = step1Schema.parse(body);

    const user = await prisma.appUser.findUnique({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Email not found.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        found: true,
        userName: user.userName,
        loginId: user.loginId,
        role: user.role?.roleName || '',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.error('Login Step1 Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
`)

write('tenx-api-next/src/app/api/auth/login/step2/route.ts', `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password.' },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    const user = await prisma.appUser.findUnique({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role?.roleName || '',
    });

    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        user: {
          id: user.id,
          userName: user.userName,
          loginId: user.loginId,
          email: user.email,
          cellNo: user.cellNo,
          imageUrl: user.imageUrl,
          role: user.role?.roleName || '',
        },
      },
    });
  } catch (error) {
    console.error('Simple Login Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
`)

write('tenx-api-next/src/app/api/auth/refresh/route.ts', `import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateAccessToken } from "@/lib/auth";

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { refreshToken } = refreshSchema.parse(body);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: {
        token: refreshToken,
        isRevoked: false,
      },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired refresh token." },
        { status: 401 }
      );
    }

    const accessToken = generateAccessToken({
      userId: tokenRecord.user.id,
      role: tokenRecord.user.role?.roleName || "",
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error("Refresh Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
`)

write('tenx-api-next/src/app/api/auth/register/route.ts', `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';

const registerSchema = z.object({
  userName: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  cellNo: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  cityName: z.string().optional().nullable(),
});

async function ensureRole(roleName: string) {
  let role = await prisma.appRole.findFirst({ where: { roleName } });

  if (!role) {
    role = await prisma.appRole.create({ data: { roleName } });
  }

  return role;
}

function makeLoginId(email: string) {
  return email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 40);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    const email = validated.email.toLowerCase().trim();

    const existing = await prisma.appUser.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Email already registered.' },
        { status: 409 }
      );
    }

    const role = await ensureRole('User');
    const passwordHash = await bcrypt.hash(validated.password, 10);

    let loginId = makeLoginId(email);
    const sameLoginId = await prisma.appUser.findUnique({ where: { loginId } });
    if (sameLoginId) loginId = \`\${loginId}-\${Date.now()}\`;

    const user = await prisma.appUser.create({
      data: {
        userName: validated.userName.trim(),
        loginId,
        email,
        cellNo: validated.cellNo || null,
        passwordHash,
        roleId: role.id,
        isActive: true,
        customerProfile: {
          create: {
            companyName: validated.companyName || null,
            industry: validated.industry || null,
            cityName: validated.cityName || null,
            isActive: true,
          },
        },
        creditBalances: {
          create: {
            amount: 0,
          },
        },
      },
      include: {
        role: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role?.roleName || 'User',
    });

    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      data: {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        user: {
          id: user.id,
          userName: user.userName,
          loginId: user.loginId,
          email: user.email,
          cellNo: user.cellNo,
          imageUrl: user.imageUrl,
          role: user.role?.roleName || 'User',
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid registration data.', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Register Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
`)

// Remove location/fiscal from external login route without rewriting full file.
const externalPath = 'tenx-api-next/src/app/api/auth/external-login/route.ts'
if (fs.existsSync(externalPath)) {
  let external = read(externalPath)
  external = external.replace(/\n\s*locationId:\s*z\.string\(\)\.uuid\(\)\.optional\(\),?/g, '')
  external = external.replace(/\n\s*fiscalYearId:\s*z\.string\(\)\.uuid\(\)\.optional\(\),?/g, '')
  external = external.replace(/\n\s*locationId:\s*validated\.locationId,?/g, '')
  external = external.replace(/\n\s*fiscalYearId:\s*validated\.fiscalYearId,?/g, '')
  write(externalPath, external)
}

// Remove location/fiscal from token type.
const authLibPath = 'tenx-api-next/src/lib/auth.ts'
if (fs.existsSync(authLibPath)) {
  let auth = read(authLibPath)
  auth = auth.replace(/\n\s*locationId\?: string;/g, '')
  auth = auth.replace(/\n\s*fiscalYearId\?: string;/g, '')
  write(authLibPath, auth)
}

/* -------------------------------------------------------------------------- */
/* Remove backend API route folders                                            */
/* -------------------------------------------------------------------------- */

removeDir('tenx-api-next/src/app/api/admin/setup/fiscal-years')
removeDir('tenx-api-next/src/app/api/admin/setup/locations')
removeDir('tenx-api-next/src/app/api/admin/data/location-types')

/* -------------------------------------------------------------------------- */
/* Admin frontend cleanup                                                      */
/* -------------------------------------------------------------------------- */

// Remove admin routes/imports
const adminAppPath = 'tenx-frontend/admin-portal/src/App.jsx'
if (fs.existsSync(adminAppPath)) {
  let app = read(adminAppPath)
  app = app.replace(/\nimport LocationsPage.*$/gm, '')
  app = app.replace(/\nimport FiscalYearPage.*$/gm, '')
  app = app.replace(/\n\s*<Route path="locations"[^>]*\/>/g, '')
  app = app.replace(/\n\s*<Route path="fiscal-years"[^>]*\/>/g, '')
  write(adminAppPath, app)
}

// Remove sidebar nav items
const adminLayoutPath = 'tenx-frontend/admin-portal/src/components/AdminLayout.jsx'
if (fs.existsSync(adminLayoutPath)) {
  let layout = read(adminLayoutPath)
  layout = layout.replace(/\n\s*\{ label: 'Locations'[^}]*\},?/g, '')
  layout = layout.replace(/\n\s*\{ label: 'Fiscal Years'[^}]*\},?/g, '')
  layout = layout.replace(/\n\s*\{ label: 'Fiscal Year'[^}]*\},?/g, '')
  write(adminLayoutPath, layout)
}

// Remove API client blocks.
const adminApiPath = 'tenx-frontend/admin-portal/src/api/index.js'
if (fs.existsSync(adminApiPath)) {
  let api = read(adminApiPath)
  api = api.replace(/\nexport const locationApi = \{[\s\S]*?\n\}\n/g, '\n')
  api = api.replace(/\nexport const fiscalYearApi = \{[\s\S]*?\n\}\n/g, '\n')
  api = api.replace(/\n\s*locationTypes:\s*\{[^\n]*\},?/g, '')
  write(adminApiPath, api)
}

removeFile('tenx-frontend/admin-portal/src/pages/LocationsPage.jsx')
removeFile('tenx-frontend/admin-portal/src/pages/FiscalYearPage.jsx')

// Remove README stale references if exists.
const frontendReadme = 'tenx-frontend/README.md'
if (fs.existsSync(frontendReadme)) {
  let r = read(frontendReadme)
  r = r.replace(/.*fiscal year.*\n/gi, '')
  r = r.replace(/.*location.*\n/gi, '')
  write(frontendReadme, r)
}

/* -------------------------------------------------------------------------- */
/* Seed cleanup                                                                */
/* -------------------------------------------------------------------------- */

write('tenx-api-next/prisma/seed-admin.cjs', `const { PrismaClient } = require("@prisma/client");
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
`)

write('tenx-api-next/prisma/seed-all.cjs', `const { PrismaClient } = require("@prisma/client");
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
`)

console.log('Location/Fiscal Year cleanup complete.')
