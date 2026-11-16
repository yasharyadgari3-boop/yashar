/**
 * Search-engine settings. The site stays out of search results until the owner
 * deliberately sets SITE_INDEXABLE=true at launch (after sample content is replaced).
 */
export const DEFAULT_SITE_URL = "https://beautymed.ir";

/** Paths that are private or useless in search results. */
export const PRIVATE_PATHS = [
  "/dashboard",
  "/cart",
  "/checkout",
  "/orders",
  "/onboarding",
  "/login",
  "/mock-gateway",
  "/api/",
  "/search",
] as const;

type Env = Record<string, string | undefined>;

export function siteUrl(env: Env = process.env): URL {
  const raw = env.APP_URL?.trim();
  try {
    return new URL(raw || DEFAULT_SITE_URL);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export function isIndexable(env: Env = process.env): boolean {
  return env.SITE_INDEXABLE === "true";
}

export type RobotsConfig = {
  rules: Array<{ userAgent: string; allow?: string; disallow: string | string[] }>;
  sitemap?: string;
};

export function robotsConfig(env: Env = process.env): RobotsConfig {
  if (!isIndexable(env)) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS] }],
    sitemap: new URL("/sitemap.xml", siteUrl(env)).toString(),
  };
}

/** JSON-LD for the homepage. Only facts that are true today: the name, the address and the search page. */
export function homeJsonLd(env: Env = process.env) {
  const url = siteUrl(env).toString();
  return [
    { "@context": "https://schema.org", "@type": "Organization", name: "BeautyMed", url },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "BeautyMed",
      url,
      inLanguage: "fa-IR",
      potentialAction: {
        "@type": "SearchAction",
        target: `${new URL("/search", url).toString()}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

/** Serialize JSON-LD for a <script> tag without letting "</script>" close it early. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
