import "server-only";
import { z } from "zod";
import { isImagePublishable, missingComplianceFields, complianceFieldLabels } from "@/lib/compliance";
import { normalizePersian, toLatinDigits } from "@/lib/persian-text";
import { checkUpload } from "@/lib/upload";
import { fieldErrors } from "@/lib/validators";
import { getFileStorage } from "@/server/adapters/storage";
import { prisma } from "@/server/db";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { Viewer } from "@/server/rbac/permissions";
import { isAdmin } from "@/server/rbac/permissions";
import { randomToken } from "@/server/security";
import { audit } from "@/server/services/audit";
import { getSetting } from "@/server/services/settings";
import type { UploadedFile } from "@/server/services/verification";

const MAX_IMAGES = 6;

const priceSchema = z
  .string()
  .trim()
  .transform((v) => toLatinDigits(v).replace(/[,٬\s]/g, ""))
  .pipe(z.string().regex(/^\d{1,10}$/, "قیمت را به تومان و فقط با عدد وارد کنید."))
  .transform((v) => Number(v))
  .pipe(z.number().int().min(1, "قیمت باید بیشتر از صفر باشد."));

/** Everything an importer submits is treated as plain text data; it is never interpreted. */
export const productSchema = z.object({
  name: z.string().trim().min(2, "نام محصول را وارد کنید.").max(120),
  description: z.string().trim().min(10, "توضیح محصول را وارد کنید (حداقل ۱۰ نویسه).").max(5000),
  categoryId: z.string().min(1, "دسته را انتخاب کنید.").max(40),
  priceToman: priceSchema,
  ircCode: z.string().trim().max(60).default(""),
  importerName: z.string().trim().max(120).default(""),
  authenticityDetails: z.string().trim().max(1000).default(""),
});

function parseProduct(input: unknown) {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("اطلاعات واردشده را بررسی کنید.", fieldErrors(parsed.error));
  return parsed.data;
}

async function assertCategory(categoryId: string) {
  const exists = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!exists) throw new ValidationError("اطلاعات واردشده را بررسی کنید.", { categoryId: "دسته‌ی انتخاب‌شده معتبر نیست." });
}

export function listCategories() {
  return prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }], select: { id: true, slug: true, title: true } });
}

/* ---------------- Importer ---------------- */

/** A new product waits for admin review; it is never public on submission. */
export async function createProduct(importerId: string, input: unknown): Promise<string> {
  const data = parseProduct(input);
  await assertCategory(data.categoryId);
  const product = await prisma.product.create({
    data: {
      slug: `p-${randomToken(6).toLowerCase().replace(/[^a-z0-9]/g, "0")}`,
      name: data.name,
      description: data.description,
      searchText: normalizePersian(`${data.name} ${data.description}`),
      categoryId: data.categoryId,
      importerId,
      priceToman: data.priceToman,
      status: "PENDING",
      compliance: {
        create: { ircCode: data.ircCode, importerName: data.importerName, authenticityDetails: data.authenticityDetails },
      },
    },
    select: { id: true },
  });
  await audit({ actorId: null, action: "product.submitted", entity: "Product", entityId: product.id, meta: { importerId } });
  return product.id;
}

/** Any edit sends the product back to review, so a published product cannot change unseen. */
export async function updateProduct(importerId: string, productId: string, input: unknown): Promise<void> {
  const data = parseProduct(input);
  await assertCategory(data.categoryId);
  const owned = await prisma.product.findFirst({ where: { id: productId, importerId, deletedAt: null }, select: { id: true } });
  if (!owned) throw new NotFoundError();
  const compliance = { ircCode: data.ircCode, importerName: data.importerName, authenticityDetails: data.authenticityDetails };
  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        description: data.description,
        searchText: normalizePersian(`${data.name} ${data.description}`),
        categoryId: data.categoryId,
        priceToman: data.priceToman,
        status: "PENDING",
        rejectionReason: null,
        publishedAt: null,
      },
    }),
    prisma.productCompliance.upsert({ where: { productId }, create: { productId, ...compliance }, update: compliance }),
  ]);
  await audit({ actorId: null, action: "product.resubmitted", entity: "Product", entityId: productId, meta: { importerId } });
}

const imageMetaSchema = z.object({
  alt: z.string().trim().min(3, "متن جایگزین تصویر را بنویسید.").max(200),
  isBeforeAfter: z.boolean(),
});

export async function addProductImage(importerId: string, productId: string, meta: unknown, file: UploadedFile): Promise<void> {
  const parsed = imageMetaSchema.safeParse(meta);
  if (!parsed.success) throw new ValidationError("اطلاعات واردشده را بررسی کنید.", fieldErrors(parsed.error));
  const product = await prisma.product.findFirst({
    where: { id: productId, importerId, deletedAt: null },
    select: { id: true, _count: { select: { images: true } } },
  });
  if (!product) throw new NotFoundError();
  if (product._count.images >= MAX_IMAGES) throw new ValidationError("حداکثر ۶ تصویر برای هر محصول ممکن است.");
  const check = checkUpload(file.bytes, ["jpg", "png"]);
  if (!check.ok) throw new ValidationError("تصویر پذیرفته نشد.", { image: check.message });

  const storageKey = `product-images/${randomToken(24).toLowerCase().replace(/[^a-z0-9]/g, "x")}.${check.file.ext}`;
  await getFileStorage().put(storageKey, file.bytes);
  try {
    // A new image is an importer submission like any other edit: a published product goes back
    // to review, so nothing the importer adds is public before an admin has seen it.
    await prisma.$transaction([
      prisma.productImage.create({
        data: {
          productId,
          storageKey,
          mimeType: check.file.mime,
          alt: parsed.data.alt,
          isBeforeAfter: parsed.data.isBeforeAfter,
          sortOrder: product._count.images,
        },
      }),
      prisma.product.updateMany({
        where: { id: productId, status: "PUBLISHED" },
        data: { status: "PENDING", publishedAt: null },
      }),
    ]);
  } catch (error) {
    await getFileStorage().delete(storageKey);
    throw error;
  }
}

export async function removeProductImage(importerId: string, imageId: string): Promise<void> {
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, product: { importerId } },
    select: { id: true, storageKey: true },
  });
  if (!image) throw new NotFoundError();
  await prisma.productImage.delete({ where: { id: image.id } });
  await getFileStorage().delete(image.storageKey);
}

const importerProductSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  categoryId: true,
  priceToman: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  category: { select: { title: true } },
  compliance: { select: { ircCode: true, importerName: true, authenticityDetails: true } },
  images: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, alt: true, isBeforeAfter: true, patientConsent: true },
  },
};

export function listImporterProducts(importerId: string) {
  return prisma.product.findMany({
    where: { importerId, deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
    select: importerProductSelect,
  });
}

export function getImporterProduct(importerId: string, productId: string) {
  return prisma.product.findFirst({ where: { id: productId, importerId, deletedAt: null }, select: importerProductSelect });
}

/* ---------------- Admin ---------------- */

export function listProductsForReview() {
  return prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 200,
    select: { ...importerProductSelect, importer: { select: { companyName: true } } },
  });
}

const reviewProductSchema = z
  .object({
    productId: z.string().min(1).max(40),
    decision: z.enum(["publish", "reject"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.decision === "publish" || (v.reason?.length ?? 0) >= 3, {
    path: ["reason"],
    message: "برای رد محصول، دلیل را بنویسید.",
  });

/**
 * Publish or reject a product. Publishing is refused while a required compliance field is
 * empty. The caller must already have checked the admin role.
 */
export async function reviewProduct(adminId: string, input: unknown): Promise<void> {
  const parsed = reviewProductSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("اطلاعات واردشده را بررسی کنید.", fieldErrors(parsed.error));
  const { productId, decision, reason } = parsed.data;
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, status: true, compliance: { select: { ircCode: true, importerName: true, authenticityDetails: true } } },
  });
  if (!product) throw new NotFoundError();

  if (decision === "publish") {
    const missing = missingComplianceFields(product.compliance, await getSetting("complianceRequiredFields"));
    if (missing.length > 0) {
      throw new ValidationError(
        `این محصول تا تکمیل این موارد قابل انتشار نیست: ${missing.map((f) => complianceFieldLabels[f] ?? f).join("، ")}`,
      );
    }
    const done = await prisma.product.updateMany({
      where: { id: productId, status: "PENDING" },
      data: { status: "PUBLISHED", publishedAt: new Date(), rejectionReason: null, reviewedById: adminId },
    });
    if (done.count === 0) throw new NotFoundError("محصول در انتظار بررسی نیست.");
  } else {
    const done = await prisma.product.updateMany({
      where: { id: productId, status: { in: ["PENDING", "PUBLISHED"] } },
      data: { status: "REJECTED", publishedAt: null, rejectionReason: reason ?? null, reviewedById: adminId },
    });
    if (done.count === 0) throw new NotFoundError("این محصول قابل رد کردن نیست.");
  }
  await audit({ actorId: adminId, action: `product.${decision === "publish" ? "published" : "rejected"}`, entity: "Product", entityId: productId });
}

export async function setImageConsent(adminId: string, imageId: string, consent: boolean): Promise<void> {
  const done = await prisma.productImage.updateMany({ where: { id: imageId, isBeforeAfter: true }, data: { patientConsent: consent } });
  if (done.count === 0) throw new NotFoundError();
  await audit({ actorId: adminId, action: "image.patient_consent", entity: "ProductImage", entityId: imageId, meta: { consent } });
}

/* ---------------- Public catalog ---------------- */

export type ProductCard = {
  slug: string;
  name: string;
  categoryTitle: string;
  priceToman: number;
  image: { id: string; alt: string } | null;
};

export async function listPublishedProducts(filter: { categorySlug?: string; query?: string } = {}): Promise<ProductCard[]> {
  const requireConsent = await getSetting("beforeAfterRequiresConsent");
  const q = filter.query ? normalizePersian(filter.query) : "";
  const rows = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      ...(filter.categorySlug ? { category: { slug: filter.categorySlug } } : {}),
      ...(q ? { searchText: { contains: q } } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 60,
    select: {
      slug: true,
      name: true,
      priceToman: true,
      category: { select: { title: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, alt: true, isBeforeAfter: true, patientConsent: true } },
    },
  });
  return rows.map((p) => {
    const image = p.images.find((i) => isImagePublishable(i, requireConsent));
    return {
      slug: p.slug,
      name: p.name,
      categoryTitle: p.category.title,
      priceToman: p.priceToman,
      image: image ? { id: image.id, alt: image.alt } : null,
    };
  });
}

export async function getPublishedProduct(slug: string) {
  const requireConsent = await getSetting("beforeAfterRequiresConsent");
  const p = await prisma.product.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      priceToman: true,
      category: { select: { title: true, slug: true } },
      compliance: { select: { ircCode: true, importerName: true, authenticityDetails: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, alt: true, isBeforeAfter: true, patientConsent: true } },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceToman: p.priceToman,
    category: p.category,
    compliance: p.compliance,
    images: p.images.filter((i) => isImagePublishable(i, requireConsent)).map((i) => ({ id: i.id, alt: i.alt })),
  };
}

/**
 * Image bytes. The public gets an image only when its product is published and the image is
 * publishable (before/after images need patient consent). The owning importer and admins can
 * always see their images. Everything else is null (the route answers 404).
 */
export async function readProductImage(viewer: Viewer, imageId: string) {
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: {
      storageKey: true,
      mimeType: true,
      isBeforeAfter: true,
      patientConsent: true,
      product: { select: { status: true, deletedAt: true, importerId: true } },
    },
  });
  if (!image || image.product.deletedAt) return null;
  const privileged = isAdmin(viewer) || (viewer?.importerProfileId != null && viewer.importerProfileId === image.product.importerId);
  if (!privileged) {
    const requireConsent = await getSetting("beforeAfterRequiresConsent");
    if (image.product.status !== "PUBLISHED" || !isImagePublishable(image, requireConsent)) return null;
  }
  const bytes = await getFileStorage().get(image.storageKey);
  return bytes ? { bytes, mimeType: image.mimeType, isPublic: !privileged } : null;
}
