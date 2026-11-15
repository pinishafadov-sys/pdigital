// Sets the single recovery email on the site owner (first OWNER account) and clears it from all others.
// Usage: npx tsx scripts/set-owner-email.mts you@example.com
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npx tsx scripts/set-owner-email.mts you@example.com");
  process.exit(1);
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }) });
const owner = await db.adminUser.findFirst({ where: { role: "OWNER" }, orderBy: { createdAt: "asc" } });
if (!owner) {
  console.error("No owner account found");
  process.exit(1);
}
await db.$transaction([
  db.adminUser.updateMany({ where: { id: { not: owner.id } }, data: { email: null } }),
  db.adminUser.update({ where: { id: owner.id }, data: { email } }),
]);
console.log(`Recovery email set on owner account "${owner.username}"`);
await db.$disconnect();
