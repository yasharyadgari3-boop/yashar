import type { Metadata } from "next";
import { HubLayout } from "@/components/hub/hub-layout";
import { LockedBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SAMPLE } from "@/content/sample";

export const metadata: Metadata = { title: "آموزش پزشکان" };

const sampleCourses = ["دوره‌ی نمونه ۱", "دوره‌ی نمونه ۲", "دوره‌ی نمونه ۳"];

/** Public landing for physician training. Courses and lessons arrive in Phase 4. */
export default function TrainingPage() {
  return (
    <HubLayout
      title="آموزش تخصصی برای پزشکان"
      lead="دوره‌ها فقط برای پزشکان تأییدشده باز می‌شوند."
      subnavLabel="زیربخش‌های آموزش"
      subnav={[
        { href: "/training", label: "دوره‌ها" },
        { href: "/login", label: "ورود و تأیید حساب پزشک" },
      ]}
      currentHref="/training"
    >
      <ul className="grid gap-6 md:grid-cols-3">
        {sampleCourses.map((course) => (
          <li key={course} className="border border-line p-6">
            <LockedBadge />
            <h2 className="mt-5 text-xl">{course}</h2>
            <p className="mt-2 text-muted">{SAMPLE}</p>
          </li>
        ))}
      </ul>
      <div className="mt-12">
        <ButtonLink href="/login">ورود پزشکان</ButtonLink>
      </div>
    </HubLayout>
  );
}
