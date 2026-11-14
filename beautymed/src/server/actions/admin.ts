"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/action-form";
import { toFormState } from "@/server/errors";
import { actionAdmin } from "@/server/guards";
import { audit } from "@/server/services/audit";
import { setSetting } from "@/server/services/settings";
import { reviewVerification, setImporterLogoPermission } from "@/server/services/verification";

export async function reviewVerificationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await actionAdmin();
    await reviewVerification(admin.id, {
      kind: formData.get("kind"),
      profileId: formData.get("profileId"),
      decision: formData.get("decision"),
      reason: formData.get("reason") || undefined,
    });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/dashboard/admin", "layout");
  return { ok: true, message: formData.get("decision") === "approve" ? "حساب تأیید شد." : "درخواست رد شد." };
}

export async function setLogoPermissionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await actionAdmin();
    await setImporterLogoPermission(admin.id, String(formData.get("profileId") ?? ""), formData.get("allowed") === "on");
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/dashboard/admin", "layout");
  return { ok: true, message: "ذخیره شد." };
}

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await actionAdmin();
    const visitorsSeePrices = formData.get("visitorsSeePrices") === "on";
    await setSetting("visitorsSeePrices", visitorsSeePrices);
    await audit({ actorId: admin.id, action: "settings.updated", entity: "SiteSetting", entityId: "visitorsSeePrices", meta: { visitorsSeePrices } });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "تنظیمات ذخیره شد." };
}
