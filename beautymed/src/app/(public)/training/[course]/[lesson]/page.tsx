import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { HubLayout } from "@/components/hub/hub-layout";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { completeLessonAction } from "@/server/actions/training";
import { getCurrentUser } from "@/server/auth/session";
import { trainingGate } from "@/server/rbac/permissions";
import { getLesson } from "@/server/services/training";

export const metadata: Metadata = { title: "درس", robots: { index: false } };

type Props = { params: Promise<{ course: string; lesson: string }> };

/**
 * A lesson. Verified physicians (and admins) see it. A visitor is sent to login, and a signed-in
 * account that is not a verified physician is sent to verification.
 */
export default async function LessonPage({ params }: Props) {
  const { course: courseSlug, lesson: lessonSlug } = await params;
  const path = `/training/${courseSlug}/${lessonSlug}`;
  const viewer = await getCurrentUser();
  const result = await getLesson(viewer, courseSlug, lessonSlug);

  if (result.state === "not_found") notFound();
  if (result.state === "denied") redirect(trainingGate(viewer, path) ?? "/training");

  const { course, lesson, completed, siblings } = result;
  const base = `/training/${course.slug}`;
  const index = siblings.findIndex((s) => s.slug === lesson.slug);
  const next = siblings[index + 1];

  return (
    <HubLayout
      title={lesson.title}
      lead={course.title}
      subnavLabel={`درس‌های ${course.title}`}
      subnav={[{ href: base, label: "فهرست درس‌ها" }, ...siblings.map((s) => ({ href: `${base}/${s.slug}`, label: s.title }))]}
      currentHref={`${base}/${lesson.slug}`}
      reviewedBy={course.reviewedBy}
    >
      <article className="max-w-3xl">
        {lesson.videoUrl ? (
          <video controls preload="metadata" playsInline src={lesson.videoUrl} className="aspect-video w-full border border-line bg-ink">
            مرورگر شما پخش ویدیو را پشتیبانی نمی‌کند.
          </video>
        ) : (
          <div role="img" aria-label="جایگاه ویدیوی درس" className="flex aspect-video items-end border border-line bg-alt p-4 text-sm text-muted">
            جایگاه ویدیوی درس — جایگزین شود. ویدیو پس از بارگذاری توسط مدیر اینجا پخش می‌شود (نسبت ابعاد ۱۶:۹، همراه با زیرنویس).
          </div>
        )}
        <div className="mt-8 whitespace-pre-line text-lg leading-9">{lesson.body}</div>

        <div className="mt-10 border-t border-line pt-6">
          {completed ? (
            <p role="status" className="border border-line bg-alt px-4 py-3">
              این درس را دیده‌اید.
            </p>
          ) : (
            <ActionForm action={completeLessonAction} hideOnSuccess>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <SubmitButton variant="secondary">ثبت به‌عنوان دیده‌شده</SubmitButton>
            </ActionForm>
          )}
          {next ? (
            <div className="mt-6">
              <ButtonLink href={`${base}/${next.slug}`}>درس بعدی: {next.title}</ButtonLink>
            </div>
          ) : null}
        </div>
      </article>
    </HubLayout>
  );
}
