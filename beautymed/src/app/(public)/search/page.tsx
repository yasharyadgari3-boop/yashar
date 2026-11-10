import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/layout";
import { searchSite } from "@/server/search";

export const metadata: Metadata = { title: "جستجو" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.slice(0, 100);
  const results = query.trim() ? await searchSite(query) : [];

  return (
    <Container className="py-14 md:py-20">
      <span aria-hidden="true" className="gold-rule mb-6" />
      <h1 className="text-4xl md:text-5xl">جستجو</h1>
      <form role="search" action="/search" method="get" className="mt-8 flex max-w-xl gap-3">
        <label htmlFor="q" className="sr-only">
          جستجو در محصولات، روش‌ها و مقاله‌ها
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="جستجو در محصولات، روش‌ها و مقاله‌ها"
          className="min-h-11 w-full rounded-sm border border-muted bg-bg px-3 text-base placeholder:text-muted"
        />
        <button type="submit" className="min-h-11 rounded-sm border border-ink bg-ink px-6 text-bg">
          جستجو
        </button>
      </form>

      {query.trim() ? (
        <section aria-live="polite" className="mt-10">
          <h2 className="text-2xl">{results.length ? "نتیجه‌ها" : "نتیجه‌ای پیدا نشد."}</h2>
          <ul className="mt-4 max-w-2xl border-t border-line">
            {results.map((r) => (
              <li key={r.href} className="border-b border-line">
                <Link href={r.href} className="flex min-h-14 flex-wrap items-center gap-x-3 py-2 text-lg hover:underline">
                  <span>{r.title}</span>
                  <span className="text-sm text-muted">{r.kind}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-8 text-sm text-muted">جستجو در مقاله‌ها پس از راه‌اندازی کتابخانه‌ی PubMed فعال می‌شود.</p>
    </Container>
  );
}
