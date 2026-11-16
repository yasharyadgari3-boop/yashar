import { describe, expect, it } from "vitest";
import { homeJsonLd, isIndexable, robotsConfig, serializeJsonLd, siteUrl } from "@/lib/seo";

describe("seo settings", () => {
  it("keeps the whole site out of search results unless SITE_INDEXABLE is exactly true", () => {
    expect(isIndexable({})).toBe(false);
    expect(isIndexable({ SITE_INDEXABLE: "1" })).toBe(false);
    expect(robotsConfig({})).toEqual({ rules: [{ userAgent: "*", disallow: "/" }] });
  });

  it("when indexable, allows public pages, hides private ones and points to the sitemap", () => {
    const config = robotsConfig({ SITE_INDEXABLE: "true", APP_URL: "https://beautymed.ir" });
    const rule = config.rules[0]!;
    expect(rule.allow).toBe("/");
    expect(rule.disallow).toEqual(expect.arrayContaining(["/dashboard", "/api/", "/checkout", "/mock-gateway"]));
    expect(config.sitemap).toBe("https://beautymed.ir/sitemap.xml");
  });

  it("falls back to beautymed.ir when APP_URL is missing or invalid", () => {
    expect(siteUrl({}).origin).toBe("https://beautymed.ir");
    expect(siteUrl({ APP_URL: "not a url" }).origin).toBe("https://beautymed.ir");
    expect(siteUrl({ APP_URL: "http://localhost:3000" }).origin).toBe("http://localhost:3000");
  });

  it("homepage structured data states only the name, address and search page", () => {
    const [org, site] = homeJsonLd({ APP_URL: "https://beautymed.ir" });
    expect(org).toEqual({ "@context": "https://schema.org", "@type": "Organization", name: "BeautyMed", url: "https://beautymed.ir/" });
    expect((site as { potentialAction: { target: string } }).potentialAction.target).toBe("https://beautymed.ir/search?q={search_term_string}");
  });

  it("escapes < so JSON-LD cannot close its script tag", () => {
    expect(serializeJsonLd({ a: "</script><script>x" })).not.toContain("</script>");
  });
});
