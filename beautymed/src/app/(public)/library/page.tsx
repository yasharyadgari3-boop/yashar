import type { Metadata } from "next";
import { HubLayout } from "@/components/hub/hub-layout";
import { TranslationBadge } from "@/components/ui/badge";
import { SampleNotice } from "@/components/ui/sample-notice";
import { libraryTopics } from "@/content/site";

export const metadata: Metadata = { title: "کتابخانه‌ی پژوهش" };

type Props = { searchParams: Promise<{ topic?: string }> };

/** Placeholder library. Real articles arrive from PubMed in Phase 5. */
export default async function LibraryPage({ searchParams }: Props) {
  const { topic } = await searchParams;
  const current = libraryTopics.find((t) => t.slug === topic);
  const currentHref = current ? `/library?topic=${current.slug}` : "/library";

  return (
    <HubLayout
      title="تازه‌ترین پژوهش‌ها، به فارسی"
      lead="مقاله‌های تازه‌ی PubMed با خلاصه‌ی فارسی. متن کامل هر مقاله در منبع اصلی است."
      subnavLabel="موضوع‌های کتابخانه"
      subnav={[
        { href: "/library", label: "همه‌ی موضوع‌ها" },
        ...libraryTopics.map((t) => ({ href: `/library?topic=${t.slug}`, label: t.title })),
      ]}
      currentHref={currentHref}
    >
      <SampleNotice text="مقاله‌ها در فاز ۵ از PubMed دریافت می‌شوند. موارد زیر نمونه‌اند." />
      <ul className="mt-10 grid gap-8 md:grid-cols-3">
        {[false, false, true].map((reviewed, index) => (
          <li key={index} className="border-t border-gold pt-6">
            <TranslationBadge reviewed={reviewed} />
            <h2 className="mt-4 text-xl">عنوان مقاله‌ی نمونه — جایگزین شود</h2>
            <p className="mt-2 text-muted">مجله و تاریخ: نمونه — جایگزین شود</p>
          </li>
        ))}
      </ul>
    </HubLayout>
  );
}
