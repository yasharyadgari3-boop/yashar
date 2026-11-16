import { expect, test, type Page } from "@playwright/test";
import { checkPage, loginAs, seed } from "./helpers";

const publishedSlug = "sample-filler-1";
const noOrderNotice = "ثبت سفارش فقط با حساب پزشک تأییدشده ممکن است.";

async function fillShipping(page: Page) {
  await page.getByLabel("نام گیرنده").fill("دکتر نمونه");
  await page.getByLabel("شهر").fill("تهران");
  await page.getByLabel("نشانی کامل").fill("خیابان نمونه، پلاک ۱، واحد ۲");
  await page.getByLabel("کد پستی (۱۰ رقم)").fill("۱۲۳۴۵۶۷۸۹۰");
}

async function addSampleToCart(page: Page) {
  await page.goto(`/shop/${publishedSlug}`);
  await page.getByRole("button", { name: "افزودن به سبد خرید" }).click();
  await expect(page).toHaveURL(/\/cart$/);
}

test("a visitor can read product information but cannot order", async ({ page }) => {
  await checkPage(page, "/shop");
  await expect(page.getByRole("link", { name: /محصول نمونه ۱/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /محصول نمونه ۲/ })).toBeVisible();
  // A product waiting for review is not public.
  await expect(page.getByText("محصول نمونه ۳")).toHaveCount(0);
  expect((await page.goto("/shop/sample-pending-1"))?.status()).toBe(404);

  await checkPage(page, `/shop/${publishedSlug}`);
  await expect(page.getByText("کد ثبت سازمان غذا و دارو (IRC)")).toBeVisible();
  await expect(page.getByText(noOrderNotice)).toBeVisible();
  await expect(page.getByRole("button", { name: "افزودن به سبد خرید" })).toHaveCount(0);
  await expect(page.getByText("قیمت برای حساب‌های تأییدشده نمایش داده می‌شود.")).toBeVisible();

  for (const path of ["/cart", "/checkout", "/orders"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});

test("an unverified physician and an importer cannot order", async ({ page }) => {
  for (const mobile of [seed.pendingPhysician, seed.importer]) {
    await page.context().clearCookies();
    await loginAs(page, mobile);
    await page.goto(`/shop/${publishedSlug}`);
    await expect(page.getByText(noOrderNotice)).toBeVisible();
    await expect(page.getByRole("button", { name: "افزودن به سبد خرید" })).toHaveCount(0);
    await page.goto("/cart");
    await expect(page.getByText(noOrderNotice)).toBeVisible();
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/cart$/);
  }
});

test("a verified physician completes a mock order", async ({ page }) => {
  await loginAs(page, seed.physician);
  await addSampleToCart(page);
  await expect(page.getByTestId("cart-total")).toHaveText("۱٬۰۰۰ تومان");

  await page.getByLabel("تعداد").fill("2");
  await page.getByRole("button", { name: "به‌روزرسانی" }).click();
  await expect(page.getByTestId("cart-total")).toHaveText("۲٬۰۰۰ تومان");
  await checkPage(page, "/cart");

  await checkPage(page, "/checkout");
  // Shipping details are validated; what was typed stays in the form.
  await fillShipping(page);
  await page.getByLabel("کد پستی (۱۰ رقم)").fill("123");
  await page.getByRole("button", { name: "ثبت سفارش و پرداخت" }).click();
  await expect(page.getByText("کد پستی باید ۱۰ رقم باشد.")).toBeVisible();
  await expect(page.getByLabel("شهر")).toHaveValue("تهران");

  await page.getByLabel("کد پستی (۱۰ رقم)").fill("۱۲۳۴۵۶۷۸۹۰");
  await page.getByRole("button", { name: "ثبت سفارش و پرداخت" }).click();

  // The mock gateway stands in for the real one.
  await expect(page).toHaveURL(/\/mock-gateway\/mock_/);
  await expect(page.getByText("۲٬۰۰۰ تومان")).toBeVisible();
  await page.getByRole("link", { name: "پرداخت موفق (آزمایشی)" }).click();

  await expect(page).toHaveURL(/\/orders\/[^/]+\?payment=ok$/);
  await expect(page.getByText("پرداخت با موفقیت انجام شد و سفارش شما ثبت شد.")).toBeVisible();
  await expect(page.getByText("پرداخت‌شده", { exact: true })).toBeVisible();
  await expect(page.getByText("کد پیگیری پرداخت")).toBeVisible();
  const orderUrl = page.url().replace(/\?.*$/, "");

  // Repeating the gateway callback does not pay twice or break the page.
  await page.goBack();
  await page.goto(orderUrl);
  await expect(page.getByText("پرداخت‌شده", { exact: true })).toBeVisible();
  await checkPage(page, new URL(orderUrl).pathname);

  await checkPage(page, "/orders");
  await expect(page.getByRole("link", { name: /سفارش BM\d{8}/ }).first()).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByText("سبد خرید شما خالی است.")).toBeVisible();

  // Someone else's order (or a made-up one) looks like it does not exist.
  expect((await page.goto("/orders/not-my-order"))?.status()).toBe(404);
  await page.context().clearCookies();
  await loginAs(page, seed.pendingPhysician);
  expect((await page.goto(new URL(orderUrl).pathname))?.status()).toBe(404);

  // The importer sees the paid line for its product; the admin sees the order.
  await page.context().clearCookies();
  await loginAs(page, seed.importer);
  await checkPage(page, "/dashboard/importer/orders");
  await expect(page.getByText(/محصول نمونه ۱ — جایگزین شود × ۲/).first()).toBeVisible();
  await page.context().clearCookies();
  await loginAs(page, seed.admin);
  await checkPage(page, "/dashboard/admin/orders");
  await expect(page.getByRole("button", { name: "ثبت به‌عنوان ارسال‌شده" }).first()).toBeVisible();
});

test("a cancelled payment leaves the order waiting and it can be paid again", async ({ page }) => {
  await loginAs(page, seed.physician);
  await addSampleToCart(page);
  await page.goto("/checkout");
  await fillShipping(page);
  await page.getByRole("button", { name: "ثبت سفارش و پرداخت" }).click();
  await page.getByRole("link", { name: "انصراف از پرداخت" }).click();

  await expect(page).toHaveURL(/\?payment=failed$/);
  await expect(page.getByText("پرداخت انجام نشد.", { exact: false })).toBeVisible();
  await expect(page.getByText("در انتظار پرداخت", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "پرداخت سفارش" }).click();
  await page.getByRole("link", { name: "پرداخت موفق (آزمایشی)" }).click();
  await expect(page.getByText("پرداخت‌شده", { exact: true })).toBeVisible();
});

test("importer submission is published only after admin approval, and never without a registration code", async ({ page, browser }) => {
  const name = `محصول آزمون ${test.info().project.name}`;
  await loginAs(page, seed.importer);
  await checkPage(page, "/dashboard/importer/products");
  await checkPage(page, "/dashboard/importer/products/new");

  // Submit without a registration code.
  await page.getByLabel("نام محصول (نام برند به لاتین)").fill(name);
  await page.getByLabel("دسته").selectOption({ label: "فیلرهای پوستی" });
  await page.getByLabel("قیمت (تومان)").fill("۲٬۵۰۰");
  await page.getByLabel("توضیح محصول").fill("توضیح نمونه برای آزمون خودکار — جایگزین شود.");
  await page.getByLabel("مشخصات اصالت (مثل برچسب اصالت و روش استعلام)").fill("نمونه — جایگزین شود");
  await page.getByRole("button", { name: "ثبت و ارسال برای بررسی" }).click();
  await expect(page).toHaveURL(/\/dashboard\/importer\/products\/[^/]+\?saved=1$/);
  await expect(page.getByText("در انتظار بررسی", { exact: true })).toBeVisible();
  const editUrl = page.url().replace(/\?.*$/, "");

  // Not public yet.
  await page.goto("/shop");
  await expect(page.getByText(name)).toHaveCount(0);

  // The admin cannot publish it while the registration code is empty.
  const adminContext = await browser.newContext({ viewport: page.viewportSize() });
  const adminPage = await adminContext.newPage();
  await loginAs(adminPage, seed.admin);
  await checkPage(adminPage, "/dashboard/admin/products");
  const card = adminPage.locator('[data-testid^="product-"]', { hasText: name });
  await expect(card.getByText(/قابل انتشار نیست/)).toBeVisible();
  await card.getByRole("button", { name: "انتشار" }).click();
  await expect(card.getByText(/تا تکمیل این موارد قابل انتشار نیست/)).toBeVisible();
  await page.goto("/shop");
  await expect(page.getByText(name)).toHaveCount(0);

  // The importer adds the code; the admin publishes; the product becomes public.
  await page.goto(editUrl);
  await page.getByLabel("کد ثبت سازمان غذا و دارو (IRC)").fill("نمونه — جایگزین شود");
  await page.getByRole("button", { name: "ذخیره و ارسال دوباره برای بررسی" }).click();
  await expect(page).toHaveURL(/\?saved=1$/);

  await adminPage.reload();
  await expect(card.getByText(/قابل انتشار نیست/)).toHaveCount(0);
  await card.getByRole("button", { name: "انتشار" }).click();
  await expect(card.getByText("منتشرشده", { exact: true })).toBeVisible();
  await adminContext.close();

  await page.goto("/shop");
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  await page.goto(`/search?q=${encodeURIComponent("آزمون")}`);
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
});

test("an importer proposes a collaboration and the admin sees it", async ({ page }) => {
  const subject = `پیشنهاد آزمون ${test.info().project.name}`;
  await loginAs(page, seed.importer);
  await checkPage(page, "/dashboard/importer/proposals");
  await page.getByLabel("موضوع").fill(subject);
  await page.getByLabel("متن پیشنهاد").fill("متن نمونه‌ی پیشنهاد همکاری برای آزمون خودکار.");
  await page.getByRole("button", { name: "ارسال پیشنهاد" }).click();
  await expect(page.getByText("پیشنهاد شما ثبت شد", { exact: false })).toBeVisible();

  await page.context().clearCookies();
  await loginAs(page, seed.admin);
  await checkPage(page, "/dashboard/admin/proposals");
  await expect(page.getByRole("heading", { name: subject })).toBeVisible();
});

test("store panels are hidden from the wrong roles", async ({ page }) => {
  await loginAs(page, seed.pendingImporter);
  for (const path of ["/dashboard/importer/products", "/dashboard/importer/products/new", "/dashboard/importer/orders"]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
  await page.context().clearCookies();
  await loginAs(page, seed.physician);
  for (const path of ["/dashboard/admin/products", "/dashboard/admin/orders", "/dashboard/importer/products"]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
  await page.context().clearCookies();
  await loginAs(page, seed.importer);
  expect((await page.goto("/orders"))?.status()).toBe(404);
  // The mock gateway page does not exist for unknown payments.
  expect((await page.goto("/mock-gateway/mock_unknown"))?.status()).toBe(404);
});

test("the admin setting controls whether visitors see prices", async ({ page, browser }) => {
  // A site-wide setting: running it in both viewports at once would let the runs flip it under each other.
  test.skip(test.info().project.name !== "desktop-1440", "server setting, checked once");
  await loginAs(page, seed.admin);
  await page.goto("/dashboard/admin/settings");
  const checkbox = page.getByLabel("بازدیدکنندگان و حساب‌های تأییدنشده هم قیمت‌ها را ببینند.");
  await checkbox.check();
  await page.getByRole("button", { name: "ذخیره‌ی تنظیمات" }).click();
  await expect(page.getByText("تنظیمات ذخیره شد.")).toBeVisible();

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/shop/${publishedSlug}`);
  await expect(visitor.getByText("۱٬۰۰۰ تومان")).toBeVisible();

  await checkbox.uncheck();
  await page.getByRole("button", { name: "ذخیره‌ی تنظیمات" }).click();
  // The message from the first save may still be on screen, so confirm the stored value instead.
  await expect(async () => {
    await page.reload();
    await expect(checkbox).not.toBeChecked({ timeout: 1000 });
  }).toPass();
  await visitor.reload();
  await expect(visitor.getByText("قیمت برای حساب‌های تأییدشده نمایش داده می‌شود.")).toBeVisible();
  await visitor.context().close();
});
