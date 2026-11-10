import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubLayout } from "@/components/hub/hub-layout";
import { SampleNotice } from "@/components/ui/sample-notice";
import { getHub, hubs } from "@/content/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return hubs.flatMap((h) => h.topics.map((t) => ({ slug: h.slug, topic: t.slug })));
}

type Props = { params: Promise<{ slug: string; topic: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, topic } = await params;
  const hub = getHub(slug);
  const found = hub?.topics.find((t) => t.slug === topic);
  return { title: found && hub ? `${found.title} — ${hub.title}` : undefined };
}

export default async function HubTopicPage({ params }: Props) {
  const { slug, topic } = await params;
  const hub = getHub(slug);
  const found = hub?.topics.find((t) => t.slug === topic);
  if (!hub || !found) notFound();

  const base = `/${hub.slug}`;
  return (
    <HubLayout
      title={found.title}
      lead={hub.title}
      subnavLabel={`زیربخش‌های ${hub.title}`}
      subnav={[{ href: base, label: "نمای کلی" }, ...hub.topics.map((t) => ({ href: `${base}/${t.slug}`, label: t.title }))]}
      currentHref={`${base}/${found.slug}`}
      reviewedBy={null}
    >
      <article className="max-w-3xl">
        <SampleNotice />
        <p className="mt-6 text-muted">
          متن آموزشی این صفحه را پزشک می‌نویسد. این صفحه روش را توضیح می‌دهد و هیچ نتیجه‌ای را وعده نمی‌دهد.
        </p>
      </article>
    </HubLayout>
  );
}
