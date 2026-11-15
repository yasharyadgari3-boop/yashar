import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HubLayout } from "@/components/hub/hub-layout";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { TranslationBadge } from "@/components/ui/badge";
import { formatJalaliDate } from "@/lib/format";
import { licenseLabels, type LicenseCode } from "@/lib/pubmed";
import { requestFullTextAction, reviewTranslationAction } from "@/server/actions/library";
import { getCurrentUser } from "@/server/auth/session";
import { isAdmin } from "@/server/rbac/permissions";
import { ensureSummary, getArticle, listTopics } from "@/server/services/library";

type Props = { params: Promise<{ pmid: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pmid } = await params;
  const article = /^\d{1,10}$/.test(pmid) ? await getArticle(pmid) : null;
  return { title: article?.translations.find((t) => t.kind === "SUMMARY")?.titleFa ?? article?.title };
}

function ReviewForm({ translationId, reviewed }: { translationId: string; reviewed: boolean }) {
  return (
    <ActionForm action={reviewTranslationAction} className="mt-4 border border-line p-4">
      <input type="hidden" name="translationId" value={translationId} />
      <label htmlFor={`reviewed-${translationId}`} className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
        <input id={`reviewed-${translationId}`} name="reviewed" type="checkbox" defaultChecked={reviewed} className="mt-1.5 size-5 shrink-0 accent-ink" />
        <span>یک پزشک این ترجمه را بازبینی و تأیید کرده است.</span>
      </label>
      <SubmitButton variant="secondary">ذخیره‌ی وضعیت بازبینی</SubmitButton>
    </ActionForm>
  );
}

export default async function ArticlePage({ params }: Props) {
  const { pmid } = await params;
  if (!/^\d{1,10}$/.test(pmid)) notFound();
  const [article, viewer, topics] = await Promise.all([getArticle(pmid), getCurrentUser(), listTopics(true)]);
  if (!article) notFound();

  // Translated the first time the article is opened, then reused.
  const summary = await ensureSummary(article.id);
  const fullText = article.translations.find((t) => t.kind === "FULL_TEXT");
  const admin = isAdmin(viewer);
  const authors = Array.isArray(article.authors) ? article.authors.filter((a): a is string => typeof a === "string") : [];
  const topicSlug = article.topics[0]?.topic.slug;

  return (
    <HubLayout
      title={summary.titleFa ?? article.title}
      subnavLabel="موضوع‌های کتابخانه"
      subnav={[{ href: "/library", label: "همه‌ی موضوع‌ها" }, ...topics.map((t) => ({ href: `/library?topic=${t.slug}`, label: t.title }))]}
      currentHref={topicSlug ? `/library?topic=${topicSlug}` : "/library"}
    >
      <article className="max-w-3xl">
        <p>
          <TranslationBadge reviewed={summary.physicianReviewed} />
        </p>
        <h2 lang="en" dir="ltr" className="mt-5 text-start text-2xl">
          {article.title}
        </h2>

        <dl className="mt-6 space-y-2 border-y border-line py-5 text-base">
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted">نویسندگان:</dt>
            <dd lang="en" dir="ltr" className="text-start">
              {authors.length ? authors.slice(0, 12).join(", ") + (authors.length > 12 ? " et al." : "") : "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted">مجله:</dt>
            <dd lang="en" dir="ltr" className="text-start">
              {article.journal || "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted">تاریخ انتشار:</dt>
            <dd>
              {article.publishedAt ? formatJalaliDate(article.publishedAt) : "—"}
              {article.pubDateText ? (
                <span lang="en" dir="ltr" className="ms-2 text-muted">
                  ({article.pubDateText})
                </span>
              ) : null}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted">PMID:</dt>
            <dd className="latin">{article.pmid}</dd>
          </div>
          {article.doi ? (
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted">DOI:</dt>
              <dd dir="ltr" className="break-all text-start">
                {article.doi}
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-4">
          <a href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`} target="_blank" rel="noopener noreferrer" className="link inline-flex min-h-11 items-center">
            مشاهده‌ی مقاله در منبع اصلی (PubMed)
          </a>
        </p>

        <section aria-labelledby="summary-title" className="mt-8">
          <h2 id="summary-title" className="text-2xl">
            خلاصه‌ی فارسی چکیده
          </h2>
          <p className="mt-4 whitespace-pre-line text-lg leading-9">{summary.text}</p>
          <p className="mt-4 text-sm text-muted">
            {summary.physicianReviewed
              ? "این ترجمه را یک پزشک بازبینی کرده است."
              : "این خلاصه ترجمه‌ی ماشینی است و هنوز توسط پزشک بازبینی نشده است. برای تصمیم بالینی به متن اصلی مراجعه کنید."}
          </p>
          {admin ? <ReviewForm translationId={summary.id} reviewed={summary.physicianReviewed} /> : null}
        </section>

        <section aria-labelledby="fulltext-title" className="mt-10 border-t border-line pt-8">
          <h2 id="fulltext-title" className="text-2xl">
            متن کامل
          </h2>
          {fullText ? (
            <>
              <p className="mt-4">
                <TranslationBadge reviewed={fullText.physicianReviewed} />
                <span className="ms-3 text-sm text-muted">
                  مجوز مقاله: <span className="latin">{licenseLabels[article.license as LicenseCode] ?? article.license}</span>
                </span>
              </p>
              <div className="mt-4 whitespace-pre-line text-lg leading-9">{fullText.text}</div>
              {admin ? <ReviewForm translationId={fullText.id} reviewed={fullText.physicianReviewed} /> : null}
            </>
          ) : article.fullTextTranslatable ? (
            <>
              <p className="mt-4 text-muted">
                این مقاله با مجوز <span className="latin">{licenseLabels[article.license as LicenseCode] ?? "Creative Commons"}</span> منتشر شده که ترجمه را
                مجاز می‌کند. ترجمه‌ی فارسی متن کامل با درخواست شما ساخته و برای خوانندگان بعدی نگه داشته می‌شود.
              </p>
              <ActionForm action={requestFullTextAction} className="mt-4">
                <input type="hidden" name="articleId" value={article.id} />
                <SubmitButton pendingLabel="در حال ترجمه…">ترجمه‌ی فارسی متن کامل</SubmitButton>
              </ActionForm>
            </>
          ) : (
            <p className="mt-4 text-muted">
              متن کامل این مقاله در منبع اصلی است. مجوز ناشر اجازه‌ی ترجمه‌ی متن کامل را نمی‌دهد؛ برای همین فقط خلاصه‌ی فارسی و پیوند
              مقاله ارائه می‌شود.
            </p>
          )}
        </section>

        <p className="mt-10">
          <Link href={topicSlug ? `/library?topic=${topicSlug}` : "/library"} className="link inline-flex min-h-11 items-center">
            بازگشت به کتابخانه
          </Link>
        </p>
      </article>
    </HubLayout>
  );
}
