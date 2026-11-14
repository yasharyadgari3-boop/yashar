import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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

/* ---------- Accounts ---------- */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Client } from "pg";
import { E2E_DATABASE_URL } from "../test-env";

/** Seeded test users (see prisma/seed.ts). */
export const seed = {
  admin: "09120000001",
  physician: "09120000002",
  pendingPhysician: "09120000003",
  importer: "09120000004",
  pendingImporter: "09120000005",
} as const;

export async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: E2E_DATABASE_URL });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

/**
 * Sign a seeded user in by creating a session row directly, so most tests do not spend the
 * per-number code limit. The real code flow has its own test.
 */
export async function loginAs(page: Page, mobile: string) {
  const token = randomBytes(32).toString("base64url");
  await withDb(async (db) => {
    const user = await db.query<{ id: string }>('SELECT id FROM "User" WHERE mobile = $1', [mobile]);
    if (!user.rows[0]) throw new Error(`No seeded user ${mobile}`);
    await db.query('INSERT INTO "Session" (id, "tokenHash", "userId", "expiresAt") VALUES ($1, $2, $3, now() + interval \'1 hour\')', [
      randomUUID(),
      createHash("sha256").update(token).digest("hex"),
      user.rows[0].id,
    ]);
  });
  const baseURL = test.info().project.use.baseURL!;
  await page.context().addCookies([{ name: "bm_session", value: token, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
}

/** A unique, valid mobile number per test project, so the two viewports do not collide. */
export function freshMobile(serial: number): string {
  const project = test.info().project.name === "mobile-360" ? 1 : 2;
  return `0913${project}${String(serial).padStart(6, "0")}`;
}

export const samplePdf = {
  name: "license.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n% sample document for tests\n"),
};
