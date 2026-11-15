import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { HubLayout } from "@/components/hub/hub-layout";
import { ButtonLink } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { getCurrentUser } from "@/server/auth/session";
import { canAccessTraining, trainingGate } from "@/server/rbac/permissions";
import { completedLessonIds, getCourseOutline, listPublishedCourses } from "@/server/services/training";

type Props = { params: Promise<{ course: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getCourseOutline(null, (await params).course);
  return { title: course?.title };
}

/** Course outline. Lesson titles are public; opening a lesson needs a verified physician account. */
export default async function CoursePage({ params }: Props) {
  const { course: courseSlug } = await params;
  const viewer = await getCurrentUser();
  const [course, courses] = await Promise.all([getCourseOutline(viewer, courseSlug), listPublishedCourses()]);
  if (!course) notFound();
  const unlocked = canAccessTraining(viewer);
  const done = viewer && unlocked ? await completedLessonIds(viewer.id, course.lessons.map((l) => l.id)) : new Set<string>();

  return (
    <HubLayout
      title={course.title}
      lead={course.summary}
      subnavLabel="دوره‌های آموزشی"
      subnav={[{ href: "/training", label: "همه‌ی دوره‌ها" }, ...courses.map((c) => ({ href: `/training/${c.slug}`, label: c.title }))]}
      currentHref={`/training/${course.slug}`}
      reviewedBy={course.reviewedBy}
    >
      {course.published ? null : <p className="mb-6 border-2 border-ink px-4 py-3">این دوره هنوز منتشر نشده و فقط مدیر آن را می‌بیند.</p>}
      {unlocked ? null : (
        <div className="mb-8 border border-line bg-alt p-5">
          <p>درس‌های این دوره فقط برای پزشکان تأییدشده باز می‌شود.</p>
          <div className="mt-4">
            <ButtonLink href={trainingGate(viewer, `/training/${course.slug}`) ?? "/login"} variant="secondary">
              {viewer ? "تأیید حساب پزشک" : "ورود پزشکان"}
            </ButtonLink>
          </div>
        </div>
      )}
      <h2 className="text-2xl">درس‌ها</h2>
      <ol className="mt-4 border-t border-line">
        {course.lessons.map((lesson, index) => (
          <li key={lesson.id} className="border-b border-line">
            <Link href={`/training/${course.slug}/${lesson.slug}`} className="flex min-h-14 items-center justify-between gap-4 py-3 hover:underline">
              <span>
                <span className="text-muted">{formatNumber(index + 1)}. </span>
                <span className="text-lg">{lesson.title}</span>
                {lesson.durationMinutes ? <span className="ms-3 text-sm text-muted">{formatNumber(lesson.durationMinutes)} دقیقه</span> : null}
              </span>
              {unlocked ? (
                done.has(lesson.id) ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-sm text-ink">
                    <CheckCircle2 aria-hidden="true" size={16} className="text-gold" />
                    دیده‌شده
                  </span>
                ) : null
              ) : (
                <span className="flex shrink-0 items-center gap-1.5 text-sm text-ink">
                  <Lock aria-hidden="true" size={14} className="text-gold" />
                  قفل
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
      {course.lessons.length === 0 ? <p className="mt-4 text-muted">هنوز درسی برای این دوره ثبت نشده است.</p> : null}
    </HubLayout>
  );
}
