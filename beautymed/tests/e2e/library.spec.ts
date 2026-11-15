import { expect, test } from "@playwright/test";
import { checkPage, loginAs, seed } from "./helpers";

// Sample articles seeded for browser tests (no network): 999000001 is CC BY, 999000002 is CC BY-NC, 999000003 has no license.

test("the library lists articles by topic and every page is accessible", async ({ page }) => {
  await checkPage(page, "/library");
  await expect(page.getByRole("link", { name: /Sample article 1/ })).toBeVisible();
  await checkPage(page, "/library?topic=dermal-fillers");
  await expect(page.getByRole("link", { name: /Sample article/ })).toHaveCount(3);
  await page.goto("/library?topic=mesotherapy");
  await expect(page.getByText("هنوز مقاله‌ای در این بخش دریافت نشده است.")).toBeVisible();
  expect((await page.goto("/library/123456789"))?.status()).toBe(404);
  expect((await page.goto("/library/not-a-pmid"))?.status()).toBe(404);
});

test("an article shows its details and a machine-translation label; the summary is created on first open", async ({ page }) => {
  await checkPage(page, "/library/999000003");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ترجمه‌ی آزمایشی عنوان");
  await expect(page.getByText("ترجمه‌ی ماشینی", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Sample Journal")).toBeVisible();
  await expect(page.getByText("999000003")).toBeVisible();
  await expect(page.getByRole("link", { name: "مشاهده‌ی مقاله در منبع اصلی (PubMed)" })).toHaveAttribute(
    "href",
    "https://pubmed.ncbi.nlm.nih.gov/999000003/",
  );
  await expect(page.getByText("خلاصه‌ی آزمایشی — جایگزین شود.", { exact: false })).toBeVisible();
  // The original abstract is not shown.
  await expect(page.getByText("Sample abstract for automated tests.")).toHaveCount(0);

  // Once opened, the Persian title appears in the list and on the homepage.
  await page.goto("/library");
  await expect(page.getByRole("link", { name: /ترجمه‌ی آزمایشی عنوان — Sample article 3/ })).toBeVisible();
});

test("full-text translation is offered only when the license allows it", async ({ page }) => {
  await page.goto("/library/999000001");
  await expect(page.getByRole("button", { name: "ترجمه‌ی فارسی متن کامل" })).toBeVisible();
  await expect(page.getByText("CC BY", { exact: true })).toBeVisible();

  for (const pmid of ["999000002", "999000003"]) {
    await page.goto(`/library/${pmid}`);
    await expect(page.getByRole("button", { name: "ترجمه‌ی فارسی متن کامل" })).toHaveCount(0);
    await expect(page.getByText("متن کامل این مقاله در منبع اصلی است.", { exact: false })).toBeVisible();
  }
});

test("an admin marks a translation as physician-reviewed and manages saved searches", async ({ page }) => {
  await page.goto("/library/999000002");
  await expect(page.getByLabel("یک پزشک این ترجمه را بازبینی و تأیید کرده است.")).toHaveCount(0);

  await loginAs(page, seed.admin);
  await page.goto("/library/999000002");
  const checkbox = page.getByLabel("یک پزشک این ترجمه را بازبینی و تأیید کرده است.");
  await checkbox.check();
  await page.getByRole("button", { name: "ذخیره‌ی وضعیت بازبینی" }).click();
  await expect(page.getByText("بازبینی‌شده", { exact: true })).toBeVisible();
  await expect(page.getByText("این ترجمه را یک پزشک بازبینی کرده است.")).toBeVisible();
  // Leave the seeded data as other tests expect it.
  await page.getByLabel("یک پزشک این ترجمه را بازبینی و تأیید کرده است.").uncheck();
  await page.getByRole("button", { name: "ذخیره‌ی وضعیت بازبینی" }).click();
  await expect(page.getByText("ترجمه‌ی ماشینی", { exact: true }).first()).toBeVisible();

  await checkPage(page, "/dashboard/admin/pubmed");
  const topic = page.getByTestId("topic-prf");
  await topic.getByText("ویرایش این موضوع").click();
  const title = `PRF ${test.info().project.name}`;
  await topic.getByLabel("عنوان فارسی موضوع").fill(title);
  await topic.getByRole("button", { name: "ذخیره‌ی موضوع" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.context().clearCookies();
  await loginAs(page, seed.physician);
  expect((await page.goto("/dashboard/admin/pubmed"))?.status()).toBe(404);
});

test("the homepage shows the newest articles and search finds an article", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.locator("section[aria-labelledby='research-title']");
  await expect(section.getByRole("link", { name: /Sample article/ })).toHaveCount(3);
  await page.goto("/search?q=Sample+article+2");
  await expect(page.getByRole("link", { name: /Sample article 2/ })).toBeVisible();
});
