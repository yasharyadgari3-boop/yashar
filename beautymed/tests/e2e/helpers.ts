import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Automated accessibility check (WCAG 2.2 A and AA rules). No violations of any impact are accepted. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary).toEqual([]);
}

/** The page must not scroll sideways at this viewport. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Buttons, links in navigation and form controls must be at least 44px in one dimension pair. */
export async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() => {
    const selector = "button, input:not([type=hidden]), select, textarea, summary, nav a, a[class*='min-h-11']";
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false; // not rendered at this viewport
        if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
          const label = el.closest("label");
          return !label || label.getBoundingClientRect().height < 44;
        }
        return rect.height < 43.5 || rect.width < 43.5;
      })
      .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
  });
  expect(small).toEqual([]);
}

export async function checkPage(page: Page, path: string) {
  // Reduced motion makes every revealed element visible, so the checks see the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(path);
  expect(response?.status(), `${path} status`).toBe(200);
  await expect(page.locator("h1")).toHaveCount(1);
  await expectNoHorizontalScroll(page);
  await expectTouchTargets(page);
  await expectAccessible(page);
}
