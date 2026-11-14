import "server-only";
import { z } from "zod";
import { toLatinDigits } from "@/lib/persian-text";
import { checkUpload, safeFileName } from "@/lib/upload";
import { getFileStorage } from "@/server/adapters/storage";
import { prisma } from "@/server/db";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { randomToken } from "@/server/security";
import { audit } from "@/server/services/audit";
import { fieldErrors } from "@/lib/validators";

const text = (max: number, message: string) => z.string().trim().min(2, message).max(max);

export const physicianSchema = z.object({
  fullName: text(100, "نام و نام خانوادگی را وارد کنید."),
  medicalCouncilNumber: z
    .string()
    .trim()
    .transform((v) => toLatinDigits(v))
    .pipe(z.string().regex(/^\d{3,10}$/, "شماره‌ی نظام پزشکی باید فقط عدد باشد.")),
  clinicName: z.string().trim().max(100).optional(),
});

export const importerSchema = z.object({
  companyName: text(120, "نام شرکت را وارد کنید."),
  nationalId: z
    .string()
    .trim()
    .transform((v) => toLatinDigits(v))
    .pipe(z.string().regex(/^\d{11}$/, "شناسه‌ی ملی شرکت باید ۱۱ رقم باشد.")),
  contactName: text(100, "نام نماینده‌ی شرکت را وارد کنید."),
});

export type UploadedFile = { name: string; bytes: Uint8Array };

type Kind = "physician" | "importer";

async function storeDocument(ownerId: string, kind: string, file: UploadedFile) {
  const check = checkUpload(file.bytes);
  if (!check.ok) throw new ValidationError("فایل مدرک پذیرفته نشد.", { document: check.message });
  const storageKey = `documents/${randomToken(24).toLowerCase().replace(/[^a-z0-9]/g, "x")}.${check.file.ext}`;
  await getFileStorage().put(storageKey, file.bytes);
  return {
    ownerId,
    kind,
    storageKey,
    originalName: safeFileName(file.name),
    mimeType: check.file.mime,
    size: file.bytes.length,
  };
}

async function assertCanSubmit(userId: string, kind: Kind) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true, physician: { select: { status: true } }, importer: { select: { status: true } } },
  });
  const wanted = kind === "physician" ? "PHYSICIAN" : "IMPORTER";
  if (user.role !== null && user.role !== wanted) throw new ConflictError("نوع حساب شما قبلاً مشخص شده است.");
  const status = kind === "physician" ? user.physician?.status : user.importer?.status;
  if (status === "PENDING") throw new ConflictError("درخواست شما در حال بررسی است.");
  if (status === "APPROVED") throw new ConflictError("حساب شما قبلاً تأیید شده است.");
}

/** A physician submits (or resubmits after rejection) their council number and license document. */
export async function submitPhysicianVerification(userId: string, input: unknown, file: UploadedFile): Promise<void> {
  const parsed = physicianSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("اطلاعات واردشده را بررسی کنید.", fieldErrors(parsed.error));
  await assertCanSubmit(userId, "physician");

  // The file is written before the transaction (no external calls inside transactions).
  const document = await storeDocument(userId, "medical_license", file);
  const data = { ...parsed.data, clinicName: parsed.data.clinicName || null };
  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { role: "PHYSICIAN" } }),
      prisma.physicianProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: { ...data, status: "PENDING", rejectionReason: null, reviewedById: null, reviewedAt: null },
      }),
      prisma.verificationDocument.create({ data: document }),
    ]);
  } catch (error) {
    await getFileStorage().delete(document.storageKey);
    throw error;
  }
  await audit({ actorId: userId, action: "verification.submitted", entity: "PhysicianProfile" });
}

export async function submitImporterVerification(userId: string, input: unknown, file: UploadedFile): Promise<void> {
  const parsed = importerSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("اطلاعات واردشده را بررسی کنید.", fieldErrors(parsed.error));
  await assertCanSubmit(userId, "importer");

  const document = await storeDocument(userId, "company_document", file);
  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { role: "IMPORTER" } }),
      prisma.importerProfile.upsert({
        where: { userId },
        create: { userId, ...parsed.data },
        update: { ...parsed.data, status: "PENDING", rejectionReason: null, reviewedById: null, reviewedAt: null },
      }),
      prisma.verificationDocument.create({ data: document }),
    ]);
  } catch (error) {
    await getFileStorage().delete(document.storageKey);
    throw error;
  }
  await audit({ actorId: userId, action: "verification.submitted", entity: "ImporterProfile" });
}

export const reviewSchema = z
  .object({
    kind: z.enum(["physician", "importer"]),
    profileId: z.string().min(1).max(40),
    decision: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.decision === "approve" || (v.reason?.length ?? 0) >= 3, {
    path: ["reason"],
    message: "برای رد درخواست، دلیل را بنویسید.",
  });

/** An admin approves or rejects a pending request. The caller must already have checked the admin role. */
export async function reviewVerification(adminId: string, input: unknown): Promise<void> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("اطلاعات واردشده را بررسی کنید.", fieldErrors(parsed.error));
  const { kind, profileId, decision, reason } = parsed.data;
  const data = {
    status: decision === "approve" ? ("APPROVED" as const) : ("REJECTED" as const),
    rejectionReason: decision === "approve" ? null : (reason ?? null),
    reviewedById: adminId,
    reviewedAt: new Date(),
  };
  // Only a pending request can be decided; a second decision changes nothing.
  const result =
    kind === "physician"
      ? await prisma.physicianProfile.updateMany({ where: { id: profileId, status: "PENDING" }, data })
      : await prisma.importerProfile.updateMany({ where: { id: profileId, status: "PENDING" }, data });
  if (result.count === 0) throw new NotFoundError("درخواست در انتظاری با این مشخصات پیدا نشد.");
  await audit({
    actorId: adminId,
    action: `verification.${decision === "approve" ? "approved" : "rejected"}`,
    entity: kind === "physician" ? "PhysicianProfile" : "ImporterProfile",
    entityId: profileId,
  });
}

export async function listVerifications() {
  const [physicians, importers] = await Promise.all([
    prisma.physicianProfile.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        fullName: true,
        medicalCouncilNumber: true,
        clinicName: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        user: { select: { mobile: true, documents: { select: { id: true, originalName: true }, orderBy: { createdAt: "desc" } } } },
      },
    }),
    prisma.importerProfile.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        companyName: true,
        nationalId: true,
        contactName: true,
        status: true,
        rejectionReason: true,
        logoPermission: true,
        createdAt: true,
        user: { select: { mobile: true, documents: { select: { id: true, originalName: true }, orderBy: { createdAt: "desc" } } } },
      },
    }),
  ]);
  return { physicians, importers };
}

export async function setImporterLogoPermission(adminId: string, profileId: string, allowed: boolean): Promise<void> {
  const result = await prisma.importerProfile.updateMany({ where: { id: profileId }, data: { logoPermission: allowed } });
  if (result.count === 0) throw new NotFoundError();
  await audit({ actorId: adminId, action: "importer.logo_permission", entity: "ImporterProfile", entityId: profileId, meta: { allowed } });
}

/** A document's bytes for its owner or an admin; null for everyone else (the route answers 404). */
export async function readDocument(viewer: { id: string; role: string | null }, documentId: string) {
  const doc = await prisma.verificationDocument.findUnique({ where: { id: documentId } });
  if (!doc) return null;
  const isAdmin = viewer.role === "ADMIN";
  if (!isAdmin && doc.ownerId !== viewer.id) return null;
  const bytes = await getFileStorage().get(doc.storageKey);
  if (!bytes) return null;
  if (isAdmin) await audit({ actorId: viewer.id, action: "document.viewed", entity: "VerificationDocument", entityId: doc.id });
  return { bytes, mimeType: doc.mimeType, name: doc.originalName };
}
