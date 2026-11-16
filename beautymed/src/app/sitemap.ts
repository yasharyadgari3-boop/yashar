import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { hubs } from "@/content/site";
import { siteUrl } from "@/lib/seo";
import { listArticles } from "@/server/services/library";
import { listPublishedProducts } from "@/server/services/products";
import { listPublishedCourses } from "@/server/services/training";

const staticPaths = ["/", "/shop", "/training", "/library", "/about", "/contact", "/rules"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();
  const at = (path: string) => new URL(path, base).toString();
  const [products, courses, articles] = await Promise.all([
    listPublishedProducts(),
    listPublishedCourses(500),
    listArticles({ take: 1000 }),
  ]);

  return [
    ...staticPaths.map((p) => ({ url: at(p) })),
    ...hubs.flatMap((hub) => [{ url: at(`/${hub.slug}`) }, ...hub.topics.map((t) => ({ url: at(`/${hub.slug}/${t.slug}`) }))]),
    ...products.map((p) => ({ url: at(`/shop/${p.slug}`) })),
    ...courses.map((c) => ({ url: at(`/training/${c.slug}`) })),
    ...articles.map((a) => ({ url: at(`/library/${a.pmid}`), lastModified: a.publishedAt ?? undefined })),
  ];
}
