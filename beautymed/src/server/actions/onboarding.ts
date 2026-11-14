"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/ui/action-form";
import { MAX_DOCUMENT_BYTES } from "@/lib/upload";
import { toFormState, ValidationError } from "@/server/errors";
import { actionUser } from "@/server/guards";
import {
  submitImporterVerification,
  submitPhysicianVerification,
  type UploadedFile,
} from "@/server/services/verification";

async function readUpload(formData: FormData): Promise<UploadedFile> {
  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    throw new ValidationError("فایل مدرک را انتخاب کنید.", { document: "فایل مدرک را انتخاب کنید." });
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new ValidationError("فایل مدرک پذیرفته نشد.", { document: "حجم فایل باید کمتر از ۵ مگابایت باشد." });
  }
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}

export async function submitPhysicianAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await actionUser();
    await submitPhysicianVerification(
      user.id,
      {
        fullName: formData.get("fullName"),
        medicalCouncilNumber: formData.get("medicalCouncilNumber"),
        clinicName: formData.get("clinicName") || undefined,
      },
      await readUpload(formData),
    );
  } catch (error) {
    return toFormState(error);
  }
  redirect("/dashboard/physician");
}

export async function submitImporterAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await actionUser();
    await submitImporterVerification(
      user.id,
      {
        companyName: formData.get("companyName"),
        nationalId: formData.get("nationalId"),
        contactName: formData.get("contactName"),
      },
      await readUpload(formData),
    );
  } catch (error) {
    return toFormState(error);
  }
  redirect("/dashboard/importer");
}
