"use server";

import type { FormState } from "@/components/ui/action-form";
import { NEWSLETTER_CONSENT_TEXT } from "@/content/newsletter";
import { fieldErrors, newsletterSchema } from "@/lib/validators";
import { getNewsletterStore } from "@/server/adapters/newsletter";
import { rateLimit } from "@/server/rate-limit";
import { getClientIp } from "@/server/request";

export async function subscribeNewsletter(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await getClientIp();
  if (!rateLimit(`newsletter:${ip}`, 5, 10 * 60_000)) {
    return { message: "تعداد درخواست‌ها زیاد است. چند دقیقه‌ی دیگر دوباره تلاش کنید." };
  }

  const parsed = newsletterSchema.safeParse({
    contact: String(formData.get("contact") ?? ""),
    consent: formData.get("consent") ?? undefined,
  });
  if (!parsed.success) {
    return { message: "اطلاعات واردشده را بررسی کنید.", errors: fieldErrors(parsed.error) };
  }

  await getNewsletterStore().subscribe({
    contact: parsed.data.contact,
    consentText: NEWSLETTER_CONSENT_TEXT,
    consentAt: new Date(),
  });
  return { ok: true, message: "عضویت شما ثبت شد. ارسال خبرنامه در مرحله‌ی بعدی فعال می‌شود." };
}
