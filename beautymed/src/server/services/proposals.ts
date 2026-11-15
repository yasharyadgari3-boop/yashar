import "server-only";
import { z } from "zod";
import { fieldErrors } from "@/lib/validators";
import { prisma } from "@/server/db";
import { NotFoundError, ValidationError } from "@/server/errors";

/** Importer-written text is stored and shown as plain text; it is data, never instructions. */
export const proposalSchema = z.object({
  subject: z.string().trim().min(3, "موضوع را وارد کنید.").max(150),
  message: z.string().trim().min(10, "متن پیشنهاد را وارد کنید (حداقل ۱۰ نویسه).").max(3000),
});

export async function createProposal(importerId: string, input: unknown): Promise<void> {
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("اطلاعات واردشده را بررسی کنید.", fieldErrors(parsed.error));
  await prisma.collaborationProposal.create({ data: { importerId, ...parsed.data } });
}

export function listProposalsForImporter(importerId: string) {
  return prisma.collaborationProposal.findMany({
    where: { importerId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: { id: true, subject: true, message: true, status: true, createdAt: true },
  });
}

export function listAllProposals() {
  return prisma.collaborationProposal.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 200,
    select: { id: true, subject: true, message: true, status: true, createdAt: true, importer: { select: { companyName: true } } },
  });
}

export async function markProposalReviewed(proposalId: string): Promise<void> {
  const done = await prisma.collaborationProposal.updateMany({ where: { id: proposalId, status: "NEW" }, data: { status: "REVIEWED" } });
  if (done.count === 0) throw new NotFoundError();
}
