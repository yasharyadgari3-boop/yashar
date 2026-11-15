import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { formatJalaliDateTime, formatNumber } from "@/lib/format";
import { fetchTopicAction, saveTopicAction } from "@/server/actions/library";
import { requireRole } from "@/server/auth/session";
import { listRecentRuns, listTopics } from "@/server/services/library";

export const metadata: Metadata = { title: "تنظیمات PubMed" };

const inputClass = "block min-h-11 w-full rounded-sm border border-muted bg-bg px-3 py-2 text-base";

function TopicFields({ id, topic }: { id: string; topic?: { slug: string; title: string; query: string; enabled: boolean } }) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`title-${id}`} className="mb-1.5 block">
          عنوان فارسی موضوع
        </label>
        <input id={`title-${id}`} name="title" required maxLength={120} defaultValue={topic?.title ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor={`slug-${id}`} className="mb-1.5 block">
          نشانی کوتاه (لاتین)
        </label>
        <input id={`slug-${id}`} name="slug" required dir="ltr" maxLength={60} defaultValue={topic?.slug ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor={`query-${id}`} className="mb-1.5 block">
          عبارت جست‌وجوی PubMed (با اصطلاحات MeSH)
        </label>
        <textarea id={`query-${id}`} name="query" required dir="ltr" rows={2} maxLength={1000} defaultValue={topic?.query ?? ""} className={inputClass} />
      </div>
      <label htmlFor={`enabled-${id}`} className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
        <input id={`enabled-${id}`} name="enabled" type="checkbox" defaultChecked={topic?.enabled ?? true} className="mt-1.5 size-5 shrink-0 accent-ink" />
        <span>این جست‌وجو در دریافت زمان‌بندی‌شده اجرا شود.</span>
      </label>
    </div>
  );
}

export default async function AdminPubmedPage() {
  const user = await requireRole("ADMIN", "/dashboard/admin/pubmed");
  const [topics, runs] = await Promise.all([listTopics(), listRecentRuns()]);

  return (
    <DashboardShell user={user} title="تنظیمات PubMed" currentHref="/dashboard/admin/pubmed">
      <p className="max-w-3xl text-muted">
        هر موضوع یک جست‌وجوی ذخیره‌شده‌ی PubMed است. دریافت خودکار با دستور زمان‌بندی‌شده انجام می‌شود؛ از همین‌جا هم می‌توانید یک موضوع را
        همین حالا دریافت کنید. ترجمه‌ی هر مقاله اولین باری که کسی آن را باز می‌کند ساخته می‌شود.
      </p>

      <ul className="mt-8 space-y-6">
        {topics.map((topic) => (
          <li key={topic.id} className="border border-line p-6" data-testid={`topic-${topic.slug}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl">{topic.title}</h2>
              <span className="text-sm text-muted">
                {formatNumber(topic._count.articles)} مقاله
                {topic.lastFetchedAt ? `، آخرین دریافت: ${formatJalaliDateTime(topic.lastFetchedAt)}` : "، هنوز دریافت نشده"}
              </span>
            </div>
            <ActionForm action={fetchTopicAction} className="mt-4">
              <input type="hidden" name="topicId" value={topic.id} />
              <SubmitButton variant="secondary" pendingLabel="در حال دریافت از PubMed…">
                دریافت مقاله‌های تازه‌ی این موضوع
              </SubmitButton>
            </ActionForm>
            <details className="mt-4 border-t border-line pt-3">
              <summary className="flex min-h-11 cursor-pointer items-center">ویرایش این موضوع</summary>
              <ActionForm action={saveTopicAction} className="mt-3 max-w-2xl">
                <input type="hidden" name="id" value={topic.id} />
                <TopicFields id={topic.id} topic={topic} />
                <div className="mt-4">
                  <SubmitButton variant="secondary">ذخیره‌ی موضوع</SubmitButton>
                </div>
              </ActionForm>
            </details>
          </li>
        ))}
      </ul>

      <section aria-labelledby="new-topic-title" className="mt-12 max-w-2xl">
        <h2 id="new-topic-title" className="text-2xl">
          موضوع تازه
        </h2>
        <ActionForm action={saveTopicAction} className="mt-4">
          <TopicFields id="new" />
          <div className="mt-4">
            <SubmitButton>افزودن موضوع</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="runs-title" className="mt-12">
        <h2 id="runs-title" className="text-2xl">
          آخرین دریافت‌ها
        </h2>
        {runs.length === 0 ? <p className="mt-3 text-muted">هنوز دریافتی انجام نشده است.</p> : null}
        <ul className="mt-4 border-t border-line">
          {runs.map((run) => (
            <li key={run.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
              <span>
                {run.topic.title}
                <span className="ms-3 text-sm text-muted">{formatJalaliDateTime(run.startedAt)}</span>
              </span>
              <span>{run.error ? "ناموفق" : `${formatNumber(run.found)} بررسی، ${formatNumber(run.added)} تازه`}</span>
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
