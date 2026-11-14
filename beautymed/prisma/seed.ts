/**
 * Test data for development and automated tests. Everything here is clearly labeled sample
 * data. Run with: npm run db:seed
 */
import { existsSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

export const seedUsers = {
  admin: "09120000001",
  physician: "09120000002",
  pendingPhysician: "09120000003",
  importer: "09120000004",
  pendingImporter: "09120000005",
} as const;

async function main() {
  const admin = await prisma.user.upsert({
    where: { mobile: seedUsers.admin },
    create: { mobile: seedUsers.admin, role: "ADMIN" },
    update: { role: "ADMIN" },
  });

  const physicians = [
    { mobile: seedUsers.physician, fullName: "پزشک نمونه (تأییدشده)", status: "APPROVED" as const },
    { mobile: seedUsers.pendingPhysician, fullName: "پزشک نمونه (در انتظار)", status: "PENDING" as const },
  ];
  for (const p of physicians) {
    const user = await prisma.user.upsert({
      where: { mobile: p.mobile },
      create: { mobile: p.mobile, role: "PHYSICIAN" },
      update: { role: "PHYSICIAN" },
    });
    const profile = {
      fullName: p.fullName,
      medicalCouncilNumber: "000000",
      clinicName: "کلینیک نمونه — جایگزین شود",
      status: p.status,
      reviewedById: p.status === "APPROVED" ? admin.id : null,
      reviewedAt: p.status === "APPROVED" ? new Date() : null,
    };
    await prisma.physicianProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...profile }, update: profile });
  }

  const importers = [
    { mobile: seedUsers.importer, companyName: "شرکت نمونه (تأییدشده)", status: "APPROVED" as const },
    { mobile: seedUsers.pendingImporter, companyName: "شرکت نمونه (در انتظار)", status: "PENDING" as const },
  ];
  for (const c of importers) {
    const user = await prisma.user.upsert({
      where: { mobile: c.mobile },
      create: { mobile: c.mobile, role: "IMPORTER" },
      update: { role: "IMPORTER" },
    });
    const profile = {
      companyName: c.companyName,
      nationalId: "00000000000",
      contactName: "نماینده‌ی نمونه",
      status: c.status,
      reviewedById: c.status === "APPROVED" ? admin.id : null,
      reviewedAt: c.status === "APPROVED" ? new Date() : null,
    };
    await prisma.importerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...profile }, update: profile });
  }

  console.log("Seeded test users:", seedUsers);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
