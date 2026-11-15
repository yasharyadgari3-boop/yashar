/**
 * Test data for development and automated tests. Everything here is clearly labeled sample
 * data. Run with: npm run db:seed
 */
import { existsSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizePersian } from "../src/lib/persian-text";

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

  // Store: categories and clearly labeled sample products (no real brands, codes or prices).
  const categories = [
    { slug: "dermal-fillers", title: "فیلرهای پوستی", sortOrder: 1 },
    { slug: "mesotherapy-products", title: "محصولات مزوتراپی", sortOrder: 2 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: { title: c.title, sortOrder: c.sortOrder } });
  }
  const importerUser = await prisma.user.findUniqueOrThrow({ where: { mobile: seedUsers.importer }, include: { importer: true } });
  const importerId = importerUser.importer!.id;
  const sample = "نمونه — جایگزین شود";
  const products = [
    { slug: "sample-filler-1", name: "محصول نمونه ۱ — جایگزین شود", category: "dermal-fillers", status: "PUBLISHED" as const, irc: sample },
    { slug: "sample-meso-1", name: "محصول نمونه ۲ — جایگزین شود", category: "mesotherapy-products", status: "PUBLISHED" as const, irc: sample },
    // Waiting for review with an empty registration code: it cannot be published until the code is filled in.
    { slug: "sample-pending-1", name: "محصول نمونه ۳ (بدون کد ثبت) — جایگزین شود", category: "dermal-fillers", status: "PENDING" as const, irc: "" },
  ];
  for (const p of products) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.category } });
    const description = "توضیح نمونه — جایگزین شود. این متن فقط برای نمایش ساختار صفحه است.";
    const data = {
      name: p.name,
      description,
      searchText: normalizePersian(`${p.name} ${description}`),
      categoryId: category.id,
      importerId,
      // Sample price only, so the mock checkout has a total. Not a real price.
      priceToman: 1000,
      status: p.status,
      publishedAt: p.status === "PUBLISHED" ? new Date() : null,
    };
    const product = await prisma.product.upsert({ where: { slug: p.slug }, create: { slug: p.slug, ...data }, update: data });
    const compliance = { ircCode: p.irc, importerName: "شرکت نمونه (تأییدشده)", authenticityDetails: p.irc ? sample : "" };
    await prisma.productCompliance.upsert({ where: { productId: product.id }, create: { productId: product.id, ...compliance }, update: compliance });
  }

  // Training: one clearly labeled sample course with two lessons (no video yet).
  const course = await prisma.course.upsert({
    where: { slug: "sample-course-1" },
    create: { slug: "sample-course-1", title: "دوره‌ی نمونه ۱ — جایگزین شود", summary: "خلاصه‌ی نمونه — جایگزین شود.", published: true, sortOrder: 1 },
    update: { published: true },
  });
  const lessons = [
    { slug: "lesson-1", title: "درس نمونه ۱ — جایگزین شود", sortOrder: 0 },
    { slug: "lesson-2", title: "درس نمونه ۲ — جایگزین شود", sortOrder: 1 },
  ];
  for (const l of lessons) {
    const data = { title: l.title, body: "محتوای نمونه — جایگزین شود. متن این درس را پزشک می‌نویسد.", sortOrder: l.sortOrder };
    await prisma.lesson.upsert({
      where: { courseId_slug: { courseId: course.id, slug: l.slug } },
      create: { courseId: course.id, slug: l.slug, ...data },
      update: data,
    });
  }

  console.log("Seeded test users:", seedUsers);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
