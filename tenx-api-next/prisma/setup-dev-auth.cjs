const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

function upsertEnv(content, key, value) {
  const line = `${key}="${value}"`;
  const regex = new RegExp(`^${key}=.*$`, "m");

  if (regex.test(content)) {
    return content.replace(regex, line);
  }

  return content.trim() + "\n" + line + "\n";
}

async function main() {
  const admin = await prisma.appUser.findUnique({ where: { email: "admin@tenx.com" } });
  const consultant = await prisma.appUser.findUnique({ where: { email: "consultant@tenx.com" } });
  const user = await prisma.appUser.findUnique({ where: { email: "user@tenx.com" } });

  if (!admin || !consultant || !user) {
    throw new Error("Admin, Consultant, or User not found. Run your seed script first.");
  }

  const envPath = path.join(process.cwd(), ".env");
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  env = upsertEnv(env, "DEV_AUTH_BYPASS", "true");
  env = upsertEnv(env, "DEV_ADMIN_USER_ID", admin.id);
  env = upsertEnv(env, "DEV_CONSULTANT_USER_ID", consultant.id);
  env = upsertEnv(env, "DEV_USER_ID", user.id);

  fs.writeFileSync(envPath, env, "utf8");

  console.log("Dev auth bypass configured:");
  console.log("Admin:", admin.id);
  console.log("Consultant:", consultant.id);
  console.log("User:", user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
