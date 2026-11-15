import { expect, test } from "@playwright/test";
import { checkPage, freshMobile, loginAs, seed } from "./helpers";

const course = "/training/sample-course-1";
const lesson = `${course}/lesson-1`;

test("a visitor sees the course outline but is sent to login for a lesson", async ({ page }) => {
  await checkPage(page, "/training");
  await expect(page.getByText("ویژه‌ی پزشکان تأییدشده").first()).toBeVisible();
  await checkPage(page, course);
  await expect(page.getByText("درس‌های این دوره فقط برای پزشکان تأییدشده باز می‌شود.")).toBeVisible();
  await expect(page.getByText("قفل").first()).toBeVisible();

  await page.goto(lesson);
  await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(lesson)}$`));
  expect((await page.goto(`${course}/no-such-lesson`))?.status()).toBe(404);
});

test("an unverified user is sent to verification instead of the lesson", async ({ page }) => {
  // A physician whose request is still pending lands on their status page.
  await loginAs(page, seed.pendingPhysician);
  await page.goto(lesson);
  await expect(page).toHaveURL(/\/dashboard\/physician$/);
  await expect(page.getByText("در انتظار بررسی")).toBeVisible();

  // An importer is told training is for physicians.
  await page.context().clearCookies();
  await loginAs(page, seed.importer);
  await page.goto(lesson);
  await expect(page).toHaveURL(/\/training\?notice=physicians-only$/);
  await expect(page.getByText("آموزش‌ها فقط برای حساب پزشک تأییدشده باز می‌شود.")).toBeVisible();

  // A brand-new account that has not chosen a type is sent to the verification form.
  await page.context().clearCookies();
  const mobile = freshMobile(4);
  await page.goto(`/login?next=${encodeURIComponent(lesson)}`);
  await page.getByLabel("شماره‌ی موبایل").fill(mobile);
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await page.getByLabel("کد ۶ رقمی").fill((await page.getByTestId("dev-otp").textContent())!.trim());
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/onboarding\?type=physician$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("تأیید حساب پزشک");
});

test("a verified physician opens a lesson and marks it as seen", async ({ page }) => {
  await loginAs(page, seed.physician);
  await checkPage(page, "/training");
  await expect(page.getByText("ویژه‌ی پزشکان تأییدشده")).toHaveCount(0);
  await checkPage(page, course);
  await page.getByRole("link", { name: /درس نمونه ۲/ }).click();
  await expect(page).toHaveURL(new RegExp(`${course}/lesson-2$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("درس نمونه ۲ — جایگزین شود");
  await expect(page.getByText("محتوای نمونه — جایگزین شود.", { exact: false })).toBeVisible();
  await expect(page.getByText("این صفحه هنوز توسط پزشک بازبینی نشده است", { exact: false })).toBeVisible();
  await checkPage(page, `${course}/lesson-2`);

  // The two viewport projects share this seeded physician, so the lesson may already be marked.
  const seen = page.getByRole("button", { name: "ثبت به‌عنوان دیده‌شده" });
  if (await seen.count()) await seen.click();
  await expect(page.getByText("این درس را دیده‌اید.")).toBeVisible();
  await page.goto(course);
  await expect(page.getByText("دیده‌شده", { exact: true })).toBeVisible();
});

test("an admin creates a course, adds a lesson and publishes it", async ({ page, browser }) => {
  const slug = `e2e-course-${test.info().project.name}`;
  const title = `دوره‌ی آزمون ${test.info().project.name}`;
  await loginAs(page, seed.admin);
  await checkPage(page, "/dashboard/admin/courses");

  await page.getByLabel("عنوان دوره").fill(title);
  await page.getByLabel("نشانی کوتاه (لاتین، مثل filler-basics)").fill(slug);
  await page.getByLabel("خلاصه‌ی دوره").fill("خلاصه‌ی آزمایشی — جایگزین شود.");
  await page.getByRole("button", { name: "ساخت دوره" }).click();
  await expect(page.getByText("دوره ساخته شد.", { exact: false })).toBeVisible();

  const card = page.getByTestId(`course-${slug}`);
  // A course with no lesson cannot be published.
  await card.getByLabel("این دوره برای پزشکان تأییدشده منتشر شود.").check();
  await card.getByRole("button", { name: "ذخیره‌ی وضعیت دوره" }).click();
  await expect(card.getByText("دوره‌ی بدون درس منتشر نمی‌شود.")).toBeVisible();

  await card.getByText("افزودن درس به این دوره").click();
  await card.getByLabel("عنوان درس").fill("درس آزمون — جایگزین شود");
  await card.getByLabel("نشانی کوتاه درس (لاتین)").fill("first");
  await card.getByLabel("متن درس").fill("متن آزمایشی درس — جایگزین شود.");
  await card.getByRole("button", { name: "افزودن درس" }).click();
  await expect(card.getByText("درس اضافه شد.")).toBeVisible();

  // Not public before publishing.
  const visitor = await (await browser.newContext()).newPage();
  expect((await visitor.goto(`/training/${slug}`))?.status()).toBe(404);

  await card.getByLabel("این دوره برای پزشکان تأییدشده منتشر شود.").check();
  await card.getByRole("button", { name: "ذخیره‌ی وضعیت دوره" }).click();
  await expect(card.getByText("دوره منتشر شد.")).toBeVisible();

  expect((await visitor.goto(`/training/${slug}`))?.status()).toBe(200);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(title);
  await visitor.context().close();

  // The course management page is hidden from other roles.
  await page.context().clearCookies();
  await loginAs(page, seed.physician);
  expect((await page.goto("/dashboard/admin/courses"))?.status()).toBe(404);
});
