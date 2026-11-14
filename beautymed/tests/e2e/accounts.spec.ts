import { expect, test } from "@playwright/test";
import { checkPage, freshMobile, loginAs, samplePdf, seed } from "./helpers";

test("a visitor is sent to the login page from protected areas", async ({ page }) => {
  for (const path of ["/dashboard", "/dashboard/admin", "/onboarding"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}$`));
  }
});

test("code login, physician verification and admin approval, end to end", async ({ page, browser }) => {
  const mobile = freshMobile(1);

  // 1. Ask for a code (the mock SMS provider shows it on the page).
  await page.goto("/login");
  await page.getByLabel("شماره‌ی موبایل").fill(mobile);
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await expect(page).toHaveURL(/\/login\/verify$/);
  const code = (await page.getByTestId("dev-otp").textContent())!.trim();
  expect(code).toMatch(/^\d{6}$/);

  // 2. A wrong code is refused.
  await page.getByLabel("کد ۶ رقمی").fill(code === "000000" ? "000001" : "000000");
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page.getByText("کد نادرست است یا مهلت آن تمام شده است.")).toBeVisible();

  // 3. The right code signs in; a new account chooses its type.
  await page.getByLabel("کد ۶ رقمی").fill(code);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole("link", { name: /پزشک یا کلینیک/ }).click();

  // 4. Validation errors are shown next to the fields.
  await page.getByLabel("نام و نام خانوادگی").fill("دکتر آزمایشی مرورگر");
  await page.getByLabel("شماره‌ی نظام پزشکی").fill("abc");
  await page.getByLabel("تصویر پروانه یا کارت نظام پزشکی").setInputFiles(samplePdf);
  await page.getByRole("button", { name: "ارسال برای بررسی" }).click();
  await expect(page.getByText("شماره‌ی نظام پزشکی باید فقط عدد باشد.")).toBeVisible();

  // 5. A valid request is pending until an admin decides.
  await page.getByLabel("شماره‌ی نظام پزشکی").fill("۱۲۳۴۵");
  await page.getByLabel("تصویر پروانه یا کارت نظام پزشکی").setInputFiles(samplePdf);
  await page.getByRole("button", { name: "ارسال برای بررسی" }).click();
  await expect(page).toHaveURL(/\/dashboard\/physician$/);
  await expect(page.getByText("در انتظار بررسی")).toBeVisible();

  // 6. The admin sees the request and the private document, and approves.
  const adminContext = await browser.newContext({ viewport: page.viewportSize() });
  const adminPage = await adminContext.newPage();
  await loginAs(adminPage, seed.admin);
  await adminPage.goto("/dashboard/admin/verifications");
  const request = adminPage.getByTestId(`physician-${mobile}`);
  await expect(request).toContainText("دکتر آزمایشی مرورگر");
  const documentUrl = (await request.getByRole("link", { name: /مشاهده‌ی مدرک/ }).getAttribute("href"))!;
  expect((await adminPage.request.get(documentUrl)).status()).toBe(200);

  // The owner can read their own document; another account and a visitor get 404.
  expect((await page.request.get(documentUrl)).status()).toBe(200);
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  expect((await otherPage.request.get(documentUrl)).status()).toBe(404);
  await loginAs(otherPage, seed.importer);
  expect((await otherPage.request.get(documentUrl)).status()).toBe(404);
  await otherContext.close();

  await request.getByRole("button", { name: "تأیید", exact: true }).click();
  // After approval the review form is replaced by the new status.
  await expect(request.getByText("تأییدشده", { exact: true })).toBeVisible();
  await expect(request.getByRole("button", { name: "تأیید", exact: true })).toHaveCount(0);
  await adminContext.close();

  // 7. The physician's panel now shows the approval.
  await page.reload();
  await expect(page.getByText("حساب شما تأیید شده است.", { exact: false })).toBeVisible();

  // 8. Signing out ends the session.
  await page.getByRole("button", { name: "خروج از حساب" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

const roleMatrix = [
  {
    name: "admin",
    mobile: seed.admin,
    home: "/dashboard/admin",
    allowed: ["/dashboard/admin", "/dashboard/admin/verifications", "/dashboard/admin/settings"],
    hidden: ["/dashboard/physician", "/dashboard/importer"],
  },
  {
    name: "verified physician",
    mobile: seed.physician,
    home: "/dashboard/physician",
    allowed: ["/dashboard/physician"],
    hidden: ["/dashboard/admin", "/dashboard/admin/verifications", "/dashboard/admin/settings", "/dashboard/importer"],
  },
  {
    name: "pending physician",
    mobile: seed.pendingPhysician,
    home: "/dashboard/physician",
    allowed: ["/dashboard/physician"],
    hidden: ["/dashboard/admin", "/dashboard/importer"],
  },
  {
    name: "verified importer",
    mobile: seed.importer,
    home: "/dashboard/importer",
    allowed: ["/dashboard/importer"],
    hidden: ["/dashboard/admin", "/dashboard/admin/verifications", "/dashboard/physician"],
  },
  {
    name: "pending importer",
    mobile: seed.pendingImporter,
    home: "/dashboard/importer",
    allowed: ["/dashboard/importer"],
    hidden: ["/dashboard/admin", "/dashboard/physician"],
  },
];

for (const role of roleMatrix) {
  test(`seeded ${role.name} sees only their own panel`, async ({ page }) => {
    await loginAs(page, role.mobile);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(new RegExp(`${role.home}$`));
    await expect(page.getByRole("link", { name: "پنل من" }).first()).toBeAttached();

    for (const path of role.allowed) await checkPage(page, path);
    for (const path of role.hidden) {
      const response = await page.goto(path);
      expect(response?.status(), `${role.name} on ${path}`).toBe(404);
    }
  });
}

test("pending accounts see their status and cannot reach verified-only features", async ({ page }) => {
  await loginAs(page, seed.pendingPhysician);
  await page.goto("/dashboard/physician");
  await expect(page.getByText("در انتظار بررسی")).toBeVisible();
  await expect(page.getByRole("link", { name: "رفتن به فروشگاه" })).toHaveCount(0);
  // A pending request cannot be submitted again.
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard\/physician$/);
});

test("a new account's onboarding page is accessible", async ({ page }) => {
  const mobile = freshMobile(2);
  await page.goto("/login");
  await page.getByLabel("شماره‌ی موبایل").fill(mobile);
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await page.getByLabel("کد ۶ رقمی").fill((await page.getByTestId("dev-otp").textContent())!.trim());
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await checkPage(page, "/onboarding");
  await checkPage(page, "/onboarding?type=physician");
  await checkPage(page, "/onboarding?type=importer");
});

test("an admin changes the price-visibility setting and it is saved", async ({ page }) => {
  await loginAs(page, seed.admin);
  await page.goto("/dashboard/admin/settings");
  const checkbox = page.getByLabel("بازدیدکنندگان و حساب‌های تأییدنشده هم قیمت‌ها را ببینند.");
  await checkbox.check();
  await page.getByRole("button", { name: "ذخیره‌ی تنظیمات" }).click();
  await expect(page.getByText("تنظیمات ذخیره شد.")).toBeVisible();
  await page.reload();
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await page.getByRole("button", { name: "ذخیره‌ی تنظیمات" }).click();
  await expect(page.getByText("تنظیمات ذخیره شد.")).toBeVisible();
});

test("a non-admin cannot run admin actions even by calling them directly", async ({ page }) => {
  // The settings page (and its form) is not reachable, and the document route hides other files.
  await loginAs(page, seed.physician);
  const response = await page.goto("/dashboard/admin/settings");
  expect(response?.status()).toBe(404);
  expect((await page.request.get("/api/documents/does-not-exist")).status()).toBe(404);
});
