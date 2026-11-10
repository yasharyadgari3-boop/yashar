import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HubLayout } from "@/components/hub/hub-layout";
import { ImageSlot } from "@/components/ui/image-slot";
import { Container } from "@/components/ui/layout";
import { SampleNotice } from "@/components/ui/sample-notice";
import { getHub, hubs } from "@/content/site";
import { SAMPLE } from "@/content/sample";

const infoPages: Record<string, { title: string }> = {
  about: { title: "درباره‌ی ما" },
  contact: { title: "تماس با ما" },
  rules: { title: "قوانین و مقررات" },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [...hubs.map((h) => ({ slug: h.slug })), ...Object.keys(infoPages).map((slug) => ({ slug }))];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: getHub(slug)?.title ?? infoPages[slug]?.title };
}

export default async function HubOrInfoPage({ params }: Props) {
  const { slug } = await params;
  const hub = getHub(slug);

  if (!hub) {
    const info = infoPages[slug];
    if (!info) notFound();
    return (
      <Container className="py-14 md:py-20">
        <span aria-hidden="true" className="gold-rule mb-6" />
        <h1 className="text-4xl md:text-5xl">{info.title}</h1>
        <SampleNotice className="mt-8" />
      </Container>
    );
  }

  const base = `/${hub.slug}`;
  return (
    <HubLayout
      title={hub.title}
      lead={SAMPLE}
      subnavLabel={`زیربخش‌های ${hub.title}`}
      subnav={[{ href: base, label: "نمای کلی" }, ...hub.topics.map((t) => ({ href: `${base}/${t.slug}`, label: t.title }))]}
      currentHref={base}
      reviewedBy={null}
    >
      <div className="grid gap-12 md:grid-cols-2">
        <ImageSlot brief={hub.image} sizes="(min-width: 48rem) 50vw, 100vw" />
        <div>
          <h2 className="text-3xl">در این بخش</h2>
          <ul className="mt-6 border-t border-line">
            {hub.topics.map((topic) => (
              <li key={topic.slug} className="border-b border-line">
                <Link href={`${base}/${topic.slug}`} className="flex min-h-14 items-center text-lg hover:underline">
                  {topic.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </HubLayout>
  );
}
