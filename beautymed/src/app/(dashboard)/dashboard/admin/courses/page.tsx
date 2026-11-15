import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, TextArea } from "@/components/ui/field";
import { addLessonAction, createCourseAction, publishCourseAction } from "@/server/actions/training";
import { requireRole } from "@/server/auth/session";
import { listCoursesForAdmin } from "@/server/services/training";

export const metadata: Metadata = { title: "دوره‌های آموزشی" };

const inputClass = "block min-h-11 w-full rounded-sm border border-muted bg-bg px-3 py-2 text-base";

export default async function AdminCoursesPage() {
  const user = await requireRole("ADMIN", "/dashboard/admin/courses");
  const courses = await listCoursesForAdmin();

  return (
    <DashboardShell user={user} title="دوره‌های آموزشی" currentHref="/dashboard/admin/courses">
      <section aria-labelledby="new-course-title" className="max-w-2xl">
        <h2 id="new-course-title" className="text-2xl">
          دوره‌ی تازه
        </h2>
        <ActionForm action={createCourseAction} className="mt-4">
          <div className="space-y-5">
            <Field label="عنوان دوره" name="title" required maxLength={150} />
            <Field label="نشانی کوتاه (لاتین، مثل filler-basics)" name="slug" required dir="ltr" maxLength={60} />
            <TextArea label="خلاصه‌ی دوره" name="summary" required rows={3} maxLength={1000} />
            <SubmitButton>ساخت دوره</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="courses-title" className="mt-14">
        <h2 id="courses-title" className="text-2xl">
          دوره‌های موجود
        </h2>
        {courses.length === 0 ? <p className="mt-4 text-muted">هنوز دوره‌ای ساخته نشده است.</p> : null}
        <ul className="mt-4 space-y-6">
          {courses.map((course) => (
            <li key={course.id} className="border border-line p-6" data-testid={`course-${course.slug}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl">
                  <Link href={`/training/${course.slug}`} className="inline-flex min-h-11 items-center hover:underline">
                    {course.title}
                  </Link>
                </h3>
                <span className="inline-block rounded-sm border border-line bg-alt px-2.5 py-0.5 text-sm">
                  {course.published ? "منتشرشده" : "منتشرنشده"}
                </span>
              </div>
              <p className="mt-2 text-muted">{course.summary}</p>
              <ol className="mt-3 list-inside list-decimal">
                {course.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    {lesson.title} {lesson.videoUrl ? "" : <span className="text-sm text-muted">(بدون ویدیو)</span>}
                  </li>
                ))}
              </ol>

              <ActionForm action={publishCourseAction} className="mt-5 border-t border-line pt-5">
                <input type="hidden" name="courseId" value={course.id} />
                <label htmlFor={`reviewed-${course.id}`} className="mb-1.5 block text-base">
                  نام پزشک بازبین محتوا (تا خالی باشد، اعلان «بازبینی نشده» نمایش داده می‌شود)
                </label>
                <input id={`reviewed-${course.id}`} name="reviewedBy" defaultValue={course.reviewedBy ?? ""} maxLength={120} className={inputClass} />
                <label htmlFor={`published-${course.id}`} className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 py-2">
                  <input
                    id={`published-${course.id}`}
                    name="published"
                    type="checkbox"
                    defaultChecked={course.published}
                    className="mt-1.5 size-5 shrink-0 accent-ink"
                  />
                  <span>این دوره برای پزشکان تأییدشده منتشر شود.</span>
                </label>
                <SubmitButton variant="secondary">ذخیره‌ی وضعیت دوره</SubmitButton>
              </ActionForm>

              <details className="mt-5 border-t border-line pt-3">
                <summary className="flex min-h-11 cursor-pointer items-center text-base">افزودن درس به این دوره</summary>
                <ActionForm action={addLessonAction} className="mt-3 max-w-2xl">
                  <input type="hidden" name="courseId" value={course.id} />
                  <div className="space-y-4">
                    <div>
                      <label htmlFor={`lesson-title-${course.id}`} className="mb-1.5 block">
                        عنوان درس
                      </label>
                      <input id={`lesson-title-${course.id}`} name="title" required maxLength={150} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor={`lesson-slug-${course.id}`} className="mb-1.5 block">
                        نشانی کوتاه درس (لاتین)
                      </label>
                      <input id={`lesson-slug-${course.id}`} name="slug" required dir="ltr" maxLength={60} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor={`lesson-body-${course.id}`} className="mb-1.5 block">
                        متن درس
                      </label>
                      <textarea id={`lesson-body-${course.id}`} name="body" required rows={5} maxLength={20000} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor={`lesson-video-${course.id}`} className="mb-1.5 block">
                        نشانی ویدیو (اختیاری، با https:// یا /)
                      </label>
                      <input id={`lesson-video-${course.id}`} name="videoUrl" dir="ltr" maxLength={500} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor={`lesson-duration-${course.id}`} className="mb-1.5 block">
                        مدت به دقیقه (اختیاری)
                      </label>
                      <input id={`lesson-duration-${course.id}`} name="durationMinutes" inputMode="numeric" dir="ltr" maxLength={3} className={inputClass} />
                    </div>
                    <SubmitButton variant="secondary">افزودن درس</SubmitButton>
                  </div>
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
