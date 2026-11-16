import type { Metadata } from "next";
import Link from "next/link";
import { HubLayout } from "@/components/hub/hub-layout";
import { TranslationBadge } from "@/components/ui/badge";
import { formatJalaliDate } from "@/lib/format";
import { listArticles, listTopics } from "@/server/services/library";

export const metadata: Metadata = { title: "کتابخانه‌ی پژوهش", alternates: { canonical: "/library" } };

type Props = { searchParams: Promise<{ topic?: string }> };

export default async function LibraryPage({ searchParams }: Props) {
  const [{ topic }, topics] = await Promise.all([searchParams, listTopics(true)]);
  const current = topics.find((t) => t.slug === topic);
  const articles = await listArticles({ topicSlug: current?.slug });

  return (
    <HubLayout
      title="تازه‌ترین پژوهش‌ها، به فارسی"
      lead="مقاله‌های تازه‌ی PubMed با خلاصه‌ی فارسی. متن کامل هر مقاله در منبع اصلی است، مگر مقاله‌هایی که مجوزشان ترجمه را مجاز می‌کند."
      subnavLabel="موضوع‌های کتابخانه"
      subnav={[{ href: "/library", label: "همه‌ی موضوع‌ها" }, ...topics.map((t) => ({ href: `/library?topic=${t.slug}`, label: t.title }))]}
      currentHref={current ? `/library?topic=${current.slug}` : "/library"}
    >
      {articles.length === 0 ? (
        <p className="text-lg text-muted">هنوز مقاله‌ای در این بخش دریافت نشده است.</p>
      ) : (
        <ul className="grid gap-x-8 gap-y-10 md:grid-cols-2">
          {articles.map((article) => {
            const summary = article.translations[0];
            return (
              <li key={article.pmid} className="border-t border-gold pt-5">
                <TranslationBadge reviewed={summary?.physicianReviewed ?? false} />
                <h2 className="mt-3 text-xl">
                  <Link href={`/library/${article.pmid}`} className="inline-flex min-h-11 items-center hover:underline">
                    {summary?.titleFa ? (
                      summary.titleFa
                    ) : (
                      <span lang="en" dir="ltr" className="text-start">
                        {article.title}
                      </span>
                    )}
                  </Link>
                </h2>
                <p className="mt-2 text-base text-muted">
                  <span lang="en" dir="ltr">
                    {article.journal}
                  </span>
                  {article.publishedAt ? <span className="ms-3">{formatJalaliDate(article.publishedAt)}</span> : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-10 text-sm text-muted">عنوان فارسی هر مقاله اولین باری که باز شود ساخته می‌شود.</p>
    </HubLayout>
  );
}
