import "server-only";
import { z } from "zod";
import { toLatinDigits } from "@/lib/persian-text";
import { fieldErrors } from "@/lib/validators";
import { prisma } from "@/server/db";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { canAccessTraining, isAdmin, type Viewer } from "@/server/rbac/permissions";
import { audit } from "@/server/services/audit";
import { Prisma } from "@/generated/prisma/client";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "نشانی کوتاه فقط با حروف کوچک لاتین، عدد و خط تیره نوشته می‌شود.")
  .min(3, "نشانی کوتاه حداقل ۳ نویسه است.")
  .max(60);

export const courseSchema = z.object({
  slug,
  title: z.string().trim().min(3, "عنوان دوره را وارد کنید.").max(150),
  summary: z.string().trim().min(10, "خلاصه‌ی دوره را وارد کنید (حداقل ۱۰ نویسه).").max(1000),
});

export const lessonSchema = z.object({
  courseId: z.string().min(1).max(40),
  slug,
  title: z.string().trim().min(3, "عنوان درس را وارد کنید.").max(150),
  body: z.string().trim().min(10, "متن درس را وارد کنید (حداقل ۱۰ نویسه).").max(20000),
  // Only https addresses or site-relative paths, so a lesson can never point the player at a script or a local file.
  videoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v) || /^\/[^\s/][^\s]*$/.test(v), "نشانی ویدیو باید با https:// یا / شروع شود.")
    .optional(),
  durationMinutes: z
    .string()
    .trim()
    .transform((v) => toLatinDigits(v))
    .refine((v) => v === "" || /^\d{1,3}$/.test(v), "مدت را به دقیقه و با عدد وارد کنید.")
    .optional(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ValidationError("اطلاعات واردشده را بررسی کنید.", fieldErrors(parsed.error));
  return parsed.data;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/* ---------------- Public ---------------- */

/** Course titles and lesson titles are public; lesson content is for verified physicians. */
export function listPublishedCourses(take = 50) {
  return prisma.course.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take,
    select: { slug: true, title: true, summary: true, _count: { select: { lessons: true } } },
  });
}

export function getCourseOutline(viewer: Viewer, courseSlug: string) {
  return prisma.course.findFirst({
    where: { slug: courseSlug, ...(isAdmin(viewer) ? {} : { published: true }) },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      published: true,
      reviewedBy: true,
      lessons: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { id: true, slug: true, title: true, durationMinutes: true },
      },
    },
  });
}

export type LessonResult =
  | { state: "not_found" }
  | { state: "denied" }
  | {
      state: "ok";
      course: { slug: string; title: string; reviewedBy: string | null };
      lesson: { id: string; slug: string; title: string; body: string; videoUrl: string | null; durationMinutes: number | null };
      completed: boolean;
      siblings: Array<{ slug: string; title: string }>;
    };

/**
 * A lesson's content. Only verified physicians and admins receive it; everyone else gets
 * "denied" and no content at all, so the page can send them to login or verification.
 */
export async function getLesson(viewer: Viewer, courseSlug: string, lessonSlug: string): Promise<LessonResult> {
  const course = await getCourseOutline(viewer, courseSlug);
  const outline = course?.lessons.find((l) => l.slug === lessonSlug);
  if (!course || !outline) return { state: "not_found" };
  if (!viewer || !canAccessTraining(viewer)) return { state: "denied" };

  const [lesson, progress] = await Promise.all([
    prisma.lesson.findUniqueOrThrow({
      where: { id: outline.id },
      select: { id: true, slug: true, title: true, body: true, videoUrl: true, durationMinutes: true },
    }),
    prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: viewer.id, lessonId: outline.id } }, select: { id: true } }),
  ]);
  return {
    state: "ok",
    course: { slug: course.slug, title: course.title, reviewedBy: course.reviewedBy },
    lesson,
    completed: progress !== null,
    siblings: course.lessons.map((l) => ({ slug: l.slug, title: l.title })),
  };
}

export async function completedLessonIds(userId: string, lessonIds: string[]): Promise<Set<string>> {
  if (lessonIds.length === 0) return new Set();
  const rows = await prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true } });
  return new Set(rows.map((r) => r.lessonId));
}

export async function markLessonComplete(viewer: Viewer, lessonId: string): Promise<void> {
  if (!viewer || !canAccessTraining(viewer)) {
    throw new AppError("این آموزش فقط برای پزشکان تأییدشده است.", "forbidden", 403);
  }
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, ...(isAdmin(viewer) ? {} : { course: { published: true } }) },
    select: { id: true },
  });
  if (!lesson) throw new NotFoundError();
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: viewer.id, lessonId } },
    create: { userId: viewer.id, lessonId },
    update: {},
  });
}

/* ---------------- Admin (the caller must already have checked the admin role) ---------------- */

export function listCoursesForAdmin() {
  return prisma.course.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 200,
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      published: true,
      reviewedBy: true,
      lessons: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, slug: true, title: true, videoUrl: true } },
    },
  });
}

export async function createCourse(adminId: string, input: unknown): Promise<string> {
  const data = parse(courseSchema, input);
  try {
    const course = await prisma.course.create({ data, select: { id: true } });
    await audit({ actorId: adminId, action: "course.created", entity: "Course", entityId: course.id });
    return course.id;
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError("دوره‌ای با این نشانی کوتاه وجود دارد.");
    throw error;
  }
}

export async function addLesson(adminId: string, input: unknown): Promise<string> {
  const data = parse(lessonSchema, input);
  const course = await prisma.course.findUnique({ where: { id: data.courseId }, select: { id: true, _count: { select: { lessons: true } } } });
  if (!course) throw new NotFoundError("دوره پیدا نشد.");
  try {
    const lesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        slug: data.slug,
        title: data.title,
        body: data.body,
        videoUrl: data.videoUrl || null,
        durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : null,
        sortOrder: course._count.lessons,
      },
      select: { id: true },
    });
    await audit({ actorId: adminId, action: "lesson.created", entity: "Lesson", entityId: lesson.id });
    return lesson.id;
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError("در این دوره درسی با این نشانی کوتاه وجود دارد.");
    throw error;
  }
}

const publishSchema = z.object({
  courseId: z.string().min(1).max(40),
  published: z.boolean(),
  reviewedBy: z.string().trim().max(120).optional(),
});

/** Publish or hide a course, and record the physician who reviewed its content. */
export async function setCoursePublished(adminId: string, input: unknown): Promise<void> {
  const data = parse(publishSchema, input);
  if (data.published) {
    const lessons = await prisma.lesson.count({ where: { courseId: data.courseId } });
    if (lessons === 0) throw new ValidationError("دوره‌ی بدون درس منتشر نمی‌شود.");
  }
  const done = await prisma.course.updateMany({
    where: { id: data.courseId },
    data: { published: data.published, reviewedBy: data.reviewedBy || null },
  });
  if (done.count === 0) throw new NotFoundError("دوره پیدا نشد.");
  await audit({ actorId: adminId, action: data.published ? "course.published" : "course.unpublished", entity: "Course", entityId: data.courseId });
}
