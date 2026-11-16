import type { Metadata } from "next";
import Link from "next/link";
import { HubLayout } from "@/components/hub/hub-layout";
import { LockedBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { getCurrentUser } from "@/server/auth/session";
import { canAccessTraining, trainingGate } from "@/server/rbac/permissions";
import { listPublishedCourses } from "@/server/services/training";

export const metadata: Metadata = { title: "آموزش پزشکان", alternates: { canonical: "/training" } };

type Props = { searchParams: Promise<{ notice?: string }> };

export default async function TrainingPage({ searchParams }: Props) {
  const [viewer, courses, { notice }] = await Promise.all([getCurrentUser(), listPublishedCourses(), searchParams]);
  const unlocked = canAccessTraining(viewer);

  return (
    <HubLayout
      title="آموزش تخصصی برای پزشکان"
      lead={unlocked ? "حساب شما تأیید شده است و همه‌ی درس‌ها برایتان باز است." : "دوره‌ها فقط برای پزشکان تأییدشده باز می‌شوند."}
      subnavLabel="دوره‌های آموزشی"
      subnav={[{ href: "/training", label: "همه‌ی دوره‌ها" }, ...courses.map((c) => ({ href: `/training/${c.slug}`, label: c.title }))]}
      currentHref="/training"
    >
      {notice === "physicians-only" ? (
        <p role="status" className="mb-8 border border-line bg-alt px-4 py-3">
          آموزش‌ها فقط برای حساب پزشک تأییدشده باز می‌شود.
        </p>
      ) : null}
      {courses.length === 0 ? (
        <p className="text-lg text-muted">هنوز دوره‌ای منتشر نشده است.</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-3">
          {courses.map((course) => (
            <li key={course.slug} className="border border-line p-6">
              {unlocked ? null : <LockedBadge />}
              <h2 className="mt-4 text-xl">
                <Link href={`/training/${course.slug}`} className="inline-flex min-h-11 items-center hover:underline">
                  {course.title}
                </Link>
              </h2>
              <p className="mt-2 text-muted">{course.summary}</p>
              <p className="mt-3 text-sm text-muted">{formatNumber(course._count.lessons)} درس</p>
            </li>
          ))}
        </ul>
      )}
      {unlocked ? null : (
        <div className="mt-12">
          <ButtonLink href={trainingGate(viewer, "/training") ?? "/login"}>{viewer ? "تأیید حساب پزشک" : "ورود پزشکان"}</ButtonLink>
        </div>
      )}
    </HubLayout>
  );
}
