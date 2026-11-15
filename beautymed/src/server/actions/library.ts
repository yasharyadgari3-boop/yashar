"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/action-form";
import { formatNumber } from "@/lib/format";
import { getPubmedClient } from "@/server/adapters/pubmed";
import { toFormState } from "@/server/errors";
import { actionAdmin } from "@/server/guards";
import { rateLimit } from "@/server/rate-limit";
import { getClientIp } from "@/server/request";
import { createFullTextTranslation, fetchTopic, saveTopic, setTranslationReviewed } from "@/server/services/library";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export async function saveTopicAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await actionAdmin();
    await saveTopic(admin.id, {
      id: text(formData, "id") || undefined,
      slug: text(formData, "slug"),
      title: text(formData, "title"),
      query: text(formData, "query"),
      enabled: formData.get("enabled") === "on",
    });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "موضوع ذخیره شد." };
}

export async function fetchTopicAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let result: { found: number; added: number };
  try {
    await actionAdmin();
    result = await fetchTopic(text(formData, "topicId"), getPubmedClient());
  } catch (error) {
    console.error("PubMed fetch failed:", error);
    return error instanceof Error && error.message.startsWith("NCBI")
      ? { message: "دریافت از PubMed ممکن نشد. اتصال به NCBI را بررسی کنید و دوباره تلاش کنید." }
      : toFormState(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `${formatNumber(result.found)} مقاله بررسی شد و ${formatNumber(result.added)} مقاله‌ی تازه اضافه شد.` };
}

export async function reviewTranslationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewed = formData.get("reviewed") === "on";
  try {
    const admin = await actionAdmin();
    await setTranslationReviewed(admin.id, text(formData, "translationId"), reviewed);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: reviewed ? "بازبینی پزشک ثبت شد." : "برچسب بازبینی برداشته شد." };
}

/** Any reader may ask for the full-text translation of an article whose license allows it; it is produced once. */
export async function requestFullTextAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    if (!rateLimit(`fulltext:${await getClientIp()}`, 5, 10 * 60_000)) {
      return { message: "تعداد درخواست‌ها زیاد است. چند دقیقه‌ی دیگر دوباره تلاش کنید." };
    }
    await createFullTextTranslation(text(formData, "articleId"), getPubmedClient());
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NCBI")) return { message: "دریافت متن کامل از PMC ممکن نشد. کمی بعد دوباره تلاش کنید." };
    return toFormState(error);
  }
  revalidatePath("/library", "layout");
  return { ok: true, message: "ترجمه‌ی متن کامل آماده شد." };
}
