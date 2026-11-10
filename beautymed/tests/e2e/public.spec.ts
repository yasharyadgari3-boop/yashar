import { expect, test } from "@playwright/test";
import { checkPage } from "./helpers";

const publicRoutes = [
  "/",
  "/methods",
  "/methods/overview",
  "/fillers",
  "/fillers/hyaluronic-acid",
  "/mesotherapy",
  "/prp",
  "/prf",
  "/prf/vs-prp",
  "/training",
  "/library",
  "/library?topic=prp",
  "/shop",
  "/about",
  "/contact",
  "/rules",
  "/search?q=prp",
  "/login",
];

for (const route of publicRoutes) {
  test(`public page ${route} renders, fits the viewport and is accessible`, async ({ page }) => {
    await checkPage(page, route);
  });
}

test("unknown pages return 404", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("صفحه پیدا نشد");
});

test("homepage shows the owner's copy for all sections, in order", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("زیبایی، بر پایه‌ی دانش");
  await expect(
    page.getByText("محصولات اصیل، آموزش تخصصی و تازه‌ترین پژوهش‌های پزشکی زیبایی، در یک جا، برای پزشکان."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "ورود پزشکان" })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("link", { name: "کشف روش‌ها" })).toHaveAttribute("href", "/methods");
  await expect(page.getByPlaceholder("جستجو در محصولات، روش‌ها و مقاله‌ها")).toBeVisible();

  const headings = await page.getByRole("heading", { level: 2 }).allTextContents();
  const expected = [
    "روش‌های زیبایی، به زبان علم",
    "محصولات اصیل، فقط برای کادر درمان",
    "PRP و PRF؛ از پایه تا پیشرفته",
    "آموزش تخصصی برای پزشکان",
    "تازه‌ترین پژوهش‌ها، به فارسی",
    "چرا پزشکان به ما اعتماد می‌کنند",
    "برای شرکت‌های واردکننده",
    "پژوهش‌های تازه، هر هفته",
  ];
  expect(headings.slice(0, expected.length)).toEqual(expected);

  for (const question of [
    "حساب پزشک چطور تأیید می‌شود؟",
    "اصالت محصولات چطور بررسی می‌شود؟",
    "ارسال به شهرستان‌ها انجام می‌شود؟",
    "شرکت‌های واردکننده چطور می‌توانند همکاری کنند؟",
    "ترجمه‌ی مقاله‌ها را چه کسی بررسی می‌کند؟",
  ]) {
    await expect(page.getByText(question)).toBeVisible();
  }
  await expect(page.getByText("تمامی حقوق این وب‌سایت محفوظ است.")).toBeVisible();
  await expect(page.getByText("ترجمه‌ی ماشینی").first()).toBeVisible();
  await expect(page.getByText("بازبینی‌شده", { exact: true }).first()).toBeVisible();
});

test("hero fills the viewport and the header turns solid after scrolling", async ({ page }) => {
  await page.goto("/");
  const viewport = page.viewportSize()!;
  const hero = await page.locator("section[aria-labelledby='hero-title']").boundingBox();
  expect(hero!.height).toBeGreaterThanOrEqual(viewport.height - 1);

  const header = page.locator("header");
  await expect(header).toHaveClass(/bg-transparent/);
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(header).toHaveClass(/bg-bg/);
});

test("FAQ accordion opens with the keyboard", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const summary = page.locator("summary", { hasText: "حساب پزشک چطور تأیید می‌شود؟" });
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details[open]")).toHaveCount(1);
});

test("newsletter requires consent, then stores the subscriber", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const contact = page.getByLabel("ایمیل یا شماره‌ی موبایل");
  await contact.fill(`visitor-${test.info().project.name}@example.com`);
  await page.getByRole("button", { name: "عضویت در خبرنامه" }).click();
  await expect(page.getByText("برای عضویت، تأیید رضایت لازم است.")).toBeVisible();

  await contact.fill(`visitor-${test.info().project.name}@example.com`);
  await page.getByLabel(/موافقم که BeautyMed/).check();
  await page.getByRole("button", { name: "عضویت در خبرنامه" }).click();
  await expect(page.getByText("عضویت شما ثبت شد.", { exact: false })).toBeVisible();
});

test("navigation matches the viewport: hamburger on mobile, full menu on desktop", async ({ page }) => {
  await page.goto("/methods");
  const mobile = page.viewportSize()!.width < 768;
  const mainNav = page.getByRole("navigation", { name: "ناوبری اصلی" });
  const menuButton = page.getByRole("button", { name: "باز کردن منو" });

  if (mobile) {
    await expect(mainNav).toBeHidden();
    await menuButton.click();
    const dialog = page.getByRole("dialog", { name: "منوی سایت" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("link", { name: "فروشگاه" }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(dialog).toBeHidden();
  } else {
    await expect(mainNav).toBeVisible();
    await expect(menuButton).toBeHidden();
    await expect(mainNav.getByRole("link")).toHaveCount(8);
    await expect(mainNav.getByRole("link", { name: "روش‌ها" })).toHaveAttribute("aria-current", "page");
  }
});

test("search finds an educational hub", async ({ page }) => {
  await page.goto("/search?q=مزوتراپی");
  await expect(page.getByRole("link", { name: /مزوتراپی چیست/ })).toBeVisible();
});
