import { expect, test } from "@playwright/test";

test.describe("launch preparation", () => {
  test("robots.txt keeps the site out of search results before launch", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/User-Agent: \*/i);
    expect(body).toMatch(/Disallow: \/\s*$/m);
  });

  test("pages carry noindex before launch, plus canonical and Open Graph tags", async ({ page }) => {
    await page.goto("/library");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/library$/);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "fa_IR");
  });

  test("homepage has honest structured data", async ({ page }) => {
    await page.goto("/");
    const json = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(json!) as Array<Record<string, unknown>>;
    expect(data.map((d) => d["@type"])).toEqual(["Organization", "WebSite"]);
    expect(Object.keys(data[0]!).sort()).toEqual(["@context", "@type", "name", "url"]);
  });

  test("sitemap lists public pages and no private ones", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    expect(body).toContain("/library");
    expect(body).toContain("/fillers/hyaluronic-acid");
    expect(body).not.toContain("/dashboard");
    expect(body).not.toContain("/checkout");
  });

  test("health check answers and every page sends security headers", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });

    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
});
