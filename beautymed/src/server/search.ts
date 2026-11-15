import "server-only";
import { hubs } from "@/content/site";
import { normalizePersian } from "@/lib/persian-text";
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

/** Published products first, then educational pages. Articles join in Phase 5. */
export async function searchSite(query: string): Promise<SearchResult[]> {
  const products = await listPublishedProducts({ query });
  return [
    ...products.map((p) => ({ href: `/shop/${p.slug}`, title: p.name, kind: `محصول، ${p.categoryTitle}` })),
    ...searchContent(query),
  ];
}
