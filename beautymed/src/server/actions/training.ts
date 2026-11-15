"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/action-form";
import { getCurrentUser } from "@/server/auth/session";
import { toFormState } from "@/server/errors";
import { actionAdmin } from "@/server/guards";
import { addLesson, createCourse, markLessonComplete, setCoursePublished } from "@/server/services/training";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export async function createCourseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await actionAdmin();
    await createCourse(admin.id, { slug: text(formData, "slug"), title: text(formData, "title"), summary: text(formData, "summary") });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/dashboard/admin/courses");
  return { ok: true, message: "دوره ساخته شد. درس‌ها را اضافه کنید و بعد منتشرش کنید." };
}

export async function addLessonAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await actionAdmin();
    await addLesson(admin.id, {
      courseId: text(formData, "courseId"),
      slug: text(formData, "slug"),
      title: text(formData, "title"),
      body: text(formData, "body"),
      videoUrl: text(formData, "videoUrl"),
      durationMinutes: text(formData, "durationMinutes"),
    });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "درس اضافه شد." };
}

export async function publishCourseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const published = formData.get("published") === "on";
  try {
    const admin = await actionAdmin();
    await setCoursePublished(admin.id, { courseId: text(formData, "courseId"), published, reviewedBy: text(formData, "reviewedBy") });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: published ? "دوره منتشر شد." : "دوره از دید پزشکان پنهان شد." };
}

export async function completeLessonAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await markLessonComplete(await getCurrentUser(), text(formData, "lessonId"));
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/training", "layout");
  return { ok: true, message: "این درس به‌عنوان «دیده‌شده» ثبت شد." };
}
