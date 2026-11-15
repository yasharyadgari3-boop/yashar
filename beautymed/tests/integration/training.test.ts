// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import type { Viewer } from "@/server/rbac/permissions";
import {
  addLesson,
  completedLessonIds,
  createCourse,
  getCourseOutline,
  getLesson,
  listPublishedCourses,
  markLessonComplete,
  setCoursePublished,
} from "@/server/services/training";
import { resetDatabase } from "./helpers";

function viewer(id: string, extra: Partial<NonNullable<Viewer>>): NonNullable<Viewer> {
  return { id, mobile: "09120000000", role: null, physicianStatus: null, importerStatus: null, importerProfileId: null, displayName: null, ...extra };
}

let adminId: string;
let admin: NonNullable<Viewer>;
let physician: NonNullable<Viewer>;
let pending: NonNullable<Viewer>;
let importer: NonNullable<Viewer>;

async function publishedCourse() {
  const courseId = await createCourse(adminId, { slug: "Filler-Basics", title: "دوره‌ی آزمایشی", summary: "خلاصه‌ی آزمایشی دوره" });
  const lessonId = await addLesson(adminId, {
    courseId,
    slug: "intro",
    title: "درس اول",
    body: "متن درس اول برای آزمون",
    videoUrl: "https://media.example.org/lesson.mp4",
    durationMinutes: "۱۲",
  });
  await addLesson(adminId, { courseId, slug: "second", title: "درس دوم", body: "متن درس دوم برای آزمون", videoUrl: "", durationMinutes: "" });
  await setCoursePublished(adminId, { courseId, published: true, reviewedBy: "دکتر بازبین" });
  return { courseId, lessonId };
}

beforeEach(async () => {
  await resetDatabase();
  const make = async (mobile: string, role: "ADMIN" | "PHYSICIAN" | "IMPORTER") => (await prisma.user.create({ data: { mobile, role } })).id;
  adminId = await make("09120000001", "ADMIN");
  admin = viewer(adminId, { role: "ADMIN" });
  physician = viewer(await make("09120000002", "PHYSICIAN"), { role: "PHYSICIAN", physicianStatus: "APPROVED" });
  pending = viewer(await make("09120000003", "PHYSICIAN"), { role: "PHYSICIAN", physicianStatus: "PENDING" });
  importer = viewer(await make("09120000004", "IMPORTER"), { role: "IMPORTER", importerStatus: "APPROVED" });
});

describe("courses", () => {
  it("are hidden until published, and cannot be published without a lesson", async () => {
    const courseId = await createCourse(adminId, { slug: "empty-course", title: "دوره‌ی خالی", summary: "خلاصه‌ی آزمایشی دوره" });
    expect(await listPublishedCourses()).toEqual([]);
    expect(await getCourseOutline(physician, "empty-course")).toBeNull();
    expect(await getCourseOutline(admin, "empty-course")).not.toBeNull();
    await expect(setCoursePublished(adminId, { courseId, published: true })).rejects.toMatchObject({ code: "validation_error" });
  });

  it("validate slugs, video addresses and duplicates", async () => {
    await expect(createCourse(adminId, { slug: "دوره", title: "دوره‌ی آزمایشی", summary: "خلاصه‌ی آزمایشی دوره" })).rejects.toMatchObject({
      code: "validation_error",
    });
    const { courseId } = await publishedCourse();
    await expect(createCourse(adminId, { slug: "filler-basics", title: "تکراری", summary: "خلاصه‌ی آزمایشی دوره" })).rejects.toMatchObject({ code: "conflict" });
    for (const videoUrl of ["javascript:alert(1)", "http://insecure.example.org/a.mp4", "//evil.example.org/a.mp4", "file:///etc/passwd"]) {
      await expect(
        addLesson(adminId, { courseId, slug: "bad-video", title: "درس بد", body: "متن درس برای آزمون", videoUrl, durationMinutes: "" }),
      ).rejects.toMatchObject({ code: "validation_error" });
    }
    await expect(
      addLesson(adminId, { courseId, slug: "intro", title: "تکراری", body: "متن درس برای آزمون", videoUrl: "", durationMinutes: "" }),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("show their outline to everyone once published", async () => {
    await publishedCourse();
    const courses = await listPublishedCourses();
    expect(courses).toMatchObject([{ slug: "filler-basics", _count: { lessons: 2 } }]);
    const outline = await getCourseOutline(null, "filler-basics");
    expect(outline?.lessons.map((l) => l.slug)).toEqual(["intro", "second"]);
    expect(outline?.reviewedBy).toBe("دکتر بازبین");
    // The public outline never carries lesson content.
    expect(JSON.stringify(outline)).not.toContain("متن درس اول");
  });
});

describe("lessons are for verified physicians", () => {
  it("a verified physician (and an admin) gets the lesson", async () => {
    await publishedCourse();
    const result = await getLesson(physician, "filler-basics", "intro");
    expect(result).toMatchObject({
      state: "ok",
      lesson: { title: "درس اول", body: "متن درس اول برای آزمون", videoUrl: "https://media.example.org/lesson.mp4", durationMinutes: 12 },
      completed: false,
    });
    expect((await getLesson(admin, "filler-basics", "intro")).state).toBe("ok");
  });

  it("visitors, unverified physicians and importers get no content", async () => {
    await publishedCourse();
    for (const v of [null, pending, importer]) {
      const result = await getLesson(v, "filler-basics", "intro");
      expect(result).toEqual({ state: "denied" });
    }
    expect(await getLesson(physician, "filler-basics", "no-such-lesson")).toEqual({ state: "not_found" });
    expect(await getLesson(physician, "no-such-course", "intro")).toEqual({ state: "not_found" });
  });

  it("an unpublished course's lessons do not exist for physicians", async () => {
    const { courseId } = await publishedCourse();
    await setCoursePublished(adminId, { courseId, published: false });
    expect(await getLesson(physician, "filler-basics", "intro")).toEqual({ state: "not_found" });
    expect((await getLesson(admin, "filler-basics", "intro")).state).toBe("ok");
  });

  it("records progress once, and only for those allowed", async () => {
    const { lessonId } = await publishedCourse();
    await expect(markLessonComplete(pending, lessonId)).rejects.toMatchObject({ code: "forbidden" });
    await expect(markLessonComplete(null, lessonId)).rejects.toMatchObject({ code: "forbidden" });
    await markLessonComplete(physician, lessonId);
    await markLessonComplete(physician, lessonId);
    expect(await prisma.lessonProgress.count()).toBe(1);
    expect((await getLesson(physician, "filler-basics", "intro")).state === "ok").toBe(true);
    expect(await completedLessonIds(physician.id, [lessonId])).toEqual(new Set([lessonId]));
    expect(await completedLessonIds(physician.id, [])).toEqual(new Set());
    await expect(markLessonComplete(physician, "no-such-lesson")).rejects.toMatchObject({ code: "not_found" });
  });
});
