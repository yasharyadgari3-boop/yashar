import { XMLParser } from "fast-xml-parser";

/**
 * Parsing of NCBI responses and the license rule for the PubMed library. Pure functions:
 * everything from NCBI is treated as data, and only plain text ever leaves this module.
 */
export type PubmedRecord = {
  pmid: string;
  pmcid: string | null;
  doi: string | null;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  pubDateText: string;
  publishedAt: Date | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
});

type Node = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined | null): T[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}

/** All text inside a parsed node, in document order (inline markup such as <i> is flattened). */
export function nodeText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(nodeText).join(" ");
  if (typeof value === "object") {
    return Object.entries(value as Node)
      .filter(([key]) => !key.startsWith("@_"))
      .map(([, v]) => nodeText(v))
      .join(" ");
  }
  return "";
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parsePubDate(pubDate: Node | undefined): { text: string; date: Date | null } {
  if (!pubDate) return { text: "", date: null };
  const medline = clean(nodeText(pubDate.MedlineDate));
  const year = clean(nodeText(pubDate.Year)) || /\d{4}/.exec(medline)?.[0] || "";
  const monthRaw = clean(nodeText(pubDate.Month));
  const day = clean(nodeText(pubDate.Day));
  const text = medline || clean([year, monthRaw, day].filter(Boolean).join(" "));
  if (!/^\d{4}$/.test(year)) return { text, date: null };
  const monthIndex = /^\d+$/.test(monthRaw) ? Number(monthRaw) - 1 : MONTHS.indexOf(monthRaw.slice(0, 3).toLowerCase());
  const date = new Date(Date.UTC(Number(year), monthIndex >= 0 ? monthIndex : 0, /^\d+$/.test(day) ? Number(day) : 1));
  return { text, date: Number.isNaN(date.getTime()) ? null : date };
}

/** Parse an efetch (db=pubmed, retmode=xml) response. Records without a PMID or title are skipped. */
export function parsePubmedXml(xml: string): PubmedRecord[] {
  const root = parser.parse(xml) as Node;
  const set = (root.PubmedArticleSet ?? {}) as Node;
  const records: PubmedRecord[] = [];
  for (const item of asArray(set.PubmedArticle as Node | Node[])) {
    const citation = (item.MedlineCitation ?? {}) as Node;
    const article = (citation.Article ?? {}) as Node;
    const pmid = clean(nodeText(citation.PMID));
    const title = clean(nodeText(article.ArticleTitle));
    if (!/^\d+$/.test(pmid) || !title) continue;

    const abstract = asArray((article.Abstract as Node | undefined)?.AbstractText as unknown[])
      .map((part) => {
        const label = typeof part === "object" && part !== null ? String((part as Node)["@_Label"] ?? "") : "";
        const body = clean(nodeText(part));
        return label ? `${label}: ${body}` : body;
      })
      .filter(Boolean)
      .join("\n");

    const authors = asArray((article.AuthorList as Node | undefined)?.Author as Node | Node[])
      .map((a) => clean(nodeText(a.CollectiveName)) || clean(`${nodeText(a.ForeName)} ${nodeText(a.LastName)}`))
      .filter(Boolean);

    // Only the article's own identifiers; the reference list has its own ArticleIdLists.
    const ids = asArray(((item.PubmedData as Node | undefined)?.ArticleIdList as Node | undefined)?.ArticleId as Node | Node[]);
    const idOf = (type: string) => {
      const found = ids.find((id) => id["@_IdType"] === type);
      return found ? clean(nodeText(found)) : null;
    };
    const pmcid = idOf("pmc");
    const journal = (article.Journal ?? {}) as Node;
    const pub = parsePubDate(((journal.JournalIssue as Node | undefined)?.PubDate ?? undefined) as Node | undefined);

    records.push({
      pmid,
      pmcid: pmcid && /^PMC\d+$/.test(pmcid) ? pmcid : null,
      doi: idOf("doi"),
      title,
      abstract,
      authors,
      journal: clean(nodeText(journal.Title)) || clean(nodeText(journal.ISOAbbreviation)),
      pubDateText: pub.text,
      publishedAt: pub.date,
    });
  }
  return records;
}

export type PmcInfo = { licenseUrl: string | null; hasFullText: boolean; fullText: string };

const MAX_FULL_TEXT_CHARS = 60_000;

function collectParagraphs(node: unknown, out: string[]): void {
  if (node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) collectParagraphs(n, out);
    return;
  }
  for (const [key, value] of Object.entries(node as Node)) {
    if (key.startsWith("@_")) continue;
    if (key === "title" || key === "p") {
      for (const v of asArray(value)) {
        const text = clean(nodeText(v));
        if (text) out.push(text);
      }
    } else if (key === "sec") {
      collectParagraphs(value, out);
    }
  }
}

/** Parse an efetch (db=pmc) response: the license reference and the body text, if PMC provides it. */
export function parsePmcXml(xml: string): PmcInfo {
  const root = parser.parse(xml) as Node;
  const article = asArray(((root["pmc-articleset"] as Node | undefined)?.article ?? undefined) as Node | Node[])[0];
  if (!article) return { licenseUrl: null, hasFullText: false, fullText: "" };

  const permissions = (((article.front as Node | undefined)?.["article-meta"] as Node | undefined)?.permissions ?? {}) as Node;
  let licenseUrl: string | null = null;
  for (const license of asArray(permissions.license as Node | Node[])) {
    const candidates = [nodeText(license["ali:license_ref"]), String(license["@_xlink:href"] ?? "")];
    licenseUrl = candidates.map(clean).find((c) => /^https?:\/\//.test(c)) ?? licenseUrl;
    if (licenseUrl) break;
  }

  const paragraphs: string[] = [];
  collectParagraphs(article.body, paragraphs);
  const fullText = paragraphs.join("\n\n").slice(0, MAX_FULL_TEXT_CHARS);
  return { licenseUrl, hasFullText: fullText.length > 0, fullText };
}

export type LicenseCode = "cc0" | "cc-by" | "cc-by-sa" | "cc-by-nd" | "cc-by-nc" | "cc-by-nc-sa" | "cc-by-nc-nd";

/** Recognize a Creative Commons license from its URL. Anything else is unknown (null). */
export function licenseCodeFromUrl(url: string | null | undefined): LicenseCode | null {
  if (!url) return null;
  const match = /^https?:\/\/creativecommons\.org\/(licenses\/(by(?:-nc)?(?:-nd|-sa)?)|publicdomain\/zero)\//i.exec(url.trim());
  if (!match) return null;
  return match[2] ? (`cc-${match[2].toLowerCase()}` as LicenseCode) : "cc0";
}

export const licenseLabels: Record<LicenseCode, string> = {
  cc0: "CC0",
  "cc-by": "CC BY",
  "cc-by-sa": "CC BY-SA",
  "cc-by-nd": "CC BY-ND",
  "cc-by-nc": "CC BY-NC",
  "cc-by-nc-sa": "CC BY-NC-SA",
  "cc-by-nc-nd": "CC BY-NC-ND",
};

/**
 * A full-text Persian translation is offered only when PMC provides the full text and the
 * license is on the allowlist of licenses that permit commercial derivative works. Unknown
 * or missing licenses are never translatable.
 */
export function isFullTextTranslatable(info: { licenseUrl: string | null; hasFullText: boolean }, allowlist: readonly string[]): boolean {
  const code = licenseCodeFromUrl(info.licenseUrl);
  return info.hasFullText && code !== null && allowlist.includes(code);
}

/** Default saved searches (MeSH where a heading exists). Each was confirmed to return results on 2026-11-15. */
export const defaultTopics: ReadonlyArray<{ slug: string; title: string; query: string }> = [
  { slug: "dermal-fillers", title: "فیلرهای پوستی (Dermal fillers)", query: '"Dermal Fillers"[mh]' },
  {
    slug: "hyaluronic-acid-fillers",
    title: "فیلرهای Hyaluronic acid",
    query: '"Hyaluronic Acid"[mh] AND ("Dermal Fillers"[mh] OR filler*[tiab])',
  },
  { slug: "mesotherapy", title: "مزوتراپی (Mesotherapy)", query: '"Mesotherapy"[mh] OR mesotherapy[tiab]' },
  {
    slug: "prp",
    title: "Platelet-rich plasma",
    query: '"Platelet-Rich Plasma"[mh] AND (skin[tiab] OR dermatolog*[tiab] OR aesthetic*[tiab] OR rejuvenation[tiab] OR hair[tiab])',
  },
  {
    slug: "prf",
    title: "Platelet-rich fibrin",
    query: '"Platelet-Rich Fibrin"[mh] AND (skin[tiab] OR facial[tiab] OR aesthetic*[tiab] OR rejuvenation[tiab])',
  },
  {
    slug: "botulinum-toxin",
    title: "Botulinum toxin در زیبایی",
    query: '"Botulinum Toxins, Type A"[mh] AND ("Cosmetic Techniques"[mh] OR aesthetic*[tiab] OR cosmetic[tiab] OR wrinkle*[tiab])',
  },
  { slug: "filler-complications", title: "عوارض فیلر", query: '"Dermal Fillers/adverse effects"[mh]' },
];
