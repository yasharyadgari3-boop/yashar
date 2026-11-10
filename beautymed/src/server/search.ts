import "server-only";
import { hubs } from "@/content/site";
import { normalizePersian } from "@/lib/persian-text";

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

export async function searchSite(query: string): Promise<SearchResult[]> {
  return searchContent(query);
}
