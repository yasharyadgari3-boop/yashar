import "server-only";
import { hubs } from "@/content/site";
import { normalizePersian } from "@/lib/persian-text";
import { searchArticles } from "@/server/services/library";
import { listPublishedProducts } from "@/server/services/products";

export type SearchResult = { href: string; title: string; kind: string };

/** Search over educational hubs and topics. Text is normalized (ي/ك, digits) on both sides. */
export function searchContent(query: string): SearchResult[] {
  const q = normalizePersian(query);
  if (!q) return [];
  const results: SearchResult[] = [];
  for (const hub of hubs) {
    if (normalizePersian(`${hub.title} ${hub.navLabel} ${hub.cardLabel}`).includes(q)) {
      results.push({ href: `/${hub.slug}`, title: hub.title, kind: "روش" });
    }
    for (const topic of hub.topics) {
      if (normalizePersian(topic.title).includes(q)) {
        results.push({ href: `/${hub.slug}/${topic.slug}`, title: topic.title, kind: hub.title });
      }
    }
  }
  return results;
}

/** Published products, educational pages, then library articles. */
export async function searchSite(query: string): Promise<SearchResult[]> {
  const [products, articles] = await Promise.all([listPublishedProducts({ query }), searchArticles(query.trim().slice(0, 100))]);
  return [
    ...products.map((p) => ({ href: `/shop/${p.slug}`, title: p.name, kind: `محصول، ${p.categoryTitle}` })),
    ...searchContent(query),
    ...articles.map((a) => ({ href: `/library/${a.pmid}`, title: a.title, kind: "مقاله" })),
  ];
}
