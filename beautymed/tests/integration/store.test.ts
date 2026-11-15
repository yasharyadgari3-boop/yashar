// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import type { Viewer } from "@/server/rbac/permissions";
import { addToCart, getCart, setCartQuantity } from "@/server/services/cart";
import {
  checkout,
  confirmPayment,
  getOrderForUser,
  listOrderItemsForImporter,
  markOrderFulfilled,
  payOrder,
} from "@/server/services/orders";
import {
  addProductImage,
  createProduct,
  getPublishedProduct,
  listPublishedProducts,
  readProductImage,
  reviewProduct,
  setImageConsent,
  updateProduct,
} from "@/server/services/products";
import { setSetting } from "@/server/services/settings";
import { resetDatabase } from "./helpers";

const png = { name: "photo.png", bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]) };
const shipping = {
  recipientName: "دکتر آزمایشی",
  phone: "09121234567",
  city: "تهران",
  address: "خیابان نمونه، پلاک ۱، واحد ۲",
  postalCode: "۱۲۳۴۵۶۷۸۹۰",
};

type World = {
  adminId: string;
  categoryId: string;
  importerA: string;
  importerB: string;
  physician: NonNullable<Viewer>;
  pendingPhysician: NonNullable<Viewer>;
  importerViewer: NonNullable<Viewer>;
};

let world: World;

function viewer(id: string, mobile: string, extra: Partial<NonNullable<Viewer>>): NonNullable<Viewer> {
  return { id, mobile, role: null, physicianStatus: null, importerStatus: null, importerProfileId: null, displayName: null, ...extra };
}

async function setUp(): Promise<World> {
  await resetDatabase();
  const admin = await prisma.user.create({ data: { mobile: "09120000001", role: "ADMIN" } });
  const category = await prisma.category.create({ data: { slug: "dermal-fillers", title: "فیلرهای پوستی" } });
  const makeImporter = async (mobile: string, companyName: string) => {
    const user = await prisma.user.create({ data: { mobile, role: "IMPORTER" } });
    const profile = await prisma.importerProfile.create({
      data: { userId: user.id, companyName, nationalId: "00000000000", contactName: "نماینده", status: "APPROVED" },
    });
    return { user, profile };
  };
  const a = await makeImporter("09120000004", "شرکت الف");
  const b = await makeImporter("09120000006", "شرکت ب");
  const makePhysician = async (mobile: string, status: "APPROVED" | "PENDING") => {
    const user = await prisma.user.create({ data: { mobile, role: "PHYSICIAN" } });
    await prisma.physicianProfile.create({ data: { userId: user.id, fullName: "دکتر آزمایشی", medicalCouncilNumber: "12345", status } });
    return viewer(user.id, mobile, { role: "PHYSICIAN", physicianStatus: status });
  };
  return {
    adminId: admin.id,
    categoryId: category.id,
    importerA: a.profile.id,
    importerB: b.profile.id,
    physician: await makePhysician("09120000002", "APPROVED"),
    pendingPhysician: await makePhysician("09120000003", "PENDING"),
    importerViewer: viewer(a.user.id, "09120000004", { role: "IMPORTER", importerStatus: "APPROVED", importerProfileId: a.profile.id }),
  };
}

function productInput(overrides: Record<string, string> = {}) {
  return {
    name: "محصول آزمایشی",
    description: "توضیح آزمایشی برای محصول نمونه",
    categoryId: world.categoryId,
    priceToman: "۱٬۵۰۰",
    ircCode: "کد-نمونه",
    importerName: "شرکت الف",
    authenticityDetails: "برچسب اصالت نمونه",
    ...overrides,
  };
}

async function publishedProduct(importerId = world.importerA, overrides: Record<string, string> = {}): Promise<string> {
  const id = await createProduct(importerId, productInput(overrides));
  await reviewProduct(world.adminId, { productId: id, decision: "publish" });
  return id;
}

beforeEach(async () => {
  world = await setUp();
});

describe("importer submission and admin approval", () => {
  it("a submitted product is not public until an admin publishes it", async () => {
    const id = await createProduct(world.importerA, productInput());
    const product = await prisma.product.findUniqueOrThrow({ where: { id } });
    expect(product.status).toBe("PENDING");
    expect(product.priceToman).toBe(1500);
    expect(await listPublishedProducts()).toEqual([]);
    expect(await getPublishedProduct(product.slug)).toBeNull();

    await reviewProduct(world.adminId, { productId: id, decision: "publish" });
    const listed = await listPublishedProducts();
    expect(listed.map((p) => p.slug)).toEqual([product.slug]);
    expect((await getPublishedProduct(product.slug))?.compliance?.ircCode).toBe("کد-نمونه");
  });

  it("refuses to publish while a required compliance field is empty", async () => {
    const id = await createProduct(world.importerA, productInput({ ircCode: "", authenticityDetails: " " }));
    await expect(reviewProduct(world.adminId, { productId: id, decision: "publish" })).rejects.toMatchObject({
      code: "validation_error",
      message: expect.stringContaining("کد ثبت سازمان غذا و دارو"),
    });
    expect((await prisma.product.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
  });

  it("the required fields come from a setting", async () => {
    const id = await createProduct(world.importerA, productInput({ authenticityDetails: "" }));
    await expect(reviewProduct(world.adminId, { productId: id, decision: "publish" })).rejects.toMatchObject({ code: "validation_error" });
    await setSetting("complianceRequiredFields", ["ircCode", "importerName"]);
    await reviewProduct(world.adminId, { productId: id, decision: "publish" });
    expect((await prisma.product.findUniqueOrThrow({ where: { id } })).status).toBe("PUBLISHED");
  });

  it("editing a published product sends it back to review and hides it", async () => {
    const id = await publishedProduct();
    await updateProduct(world.importerA, id, productInput({ name: "نام تازه" }));
    const product = await prisma.product.findUniqueOrThrow({ where: { id } });
    expect(product.status).toBe("PENDING");
    expect(await listPublishedProducts()).toEqual([]);
  });

  it("an importer cannot edit another importer's product", async () => {
    const id = await publishedProduct(world.importerA);
    await expect(updateProduct(world.importerB, id, productInput({ name: "دست‌کاری" }))).rejects.toMatchObject({ code: "not_found" });
    expect((await prisma.product.findUniqueOrThrow({ where: { id } })).name).toBe("محصول آزمایشی");
  });

  it("rejecting needs a reason and takes a published product down", async () => {
    const id = await publishedProduct();
    await expect(reviewProduct(world.adminId, { productId: id, decision: "reject" })).rejects.toMatchObject({ code: "validation_error" });
    await reviewProduct(world.adminId, { productId: id, decision: "reject", reason: "مدارک ناقص است" });
    expect(await listPublishedProducts()).toEqual([]);
  });

  it("validates product input and searches with Persian normalization", async () => {
    await expect(createProduct(world.importerA, productInput({ priceToman: "رایگان" }))).rejects.toMatchObject({ code: "validation_error" });
    await expect(createProduct(world.importerA, productInput({ categoryId: "nope" }))).rejects.toMatchObject({ code: "validation_error" });
    await publishedProduct(world.importerA, { name: "فیلر آزمایشی" });
    expect((await listPublishedProducts({ query: "فيلر" })).length).toBe(1); // Arabic ي
    expect((await listPublishedProducts({ query: "چیز دیگر" })).length).toBe(0);
  });
});

describe("before/after images", () => {
  it("are hidden from the public until an admin records patient consent", async () => {
    const id = await publishedProduct();
    await addProductImage(world.importerA, id, { alt: "تصویر قبل و بعد", isBeforeAfter: true }, png);
    await addProductImage(world.importerA, id, { alt: "بسته‌بندی محصول", isBeforeAfter: false }, png);
    await reviewProduct(world.adminId, { productId: id, decision: "reject", reason: "بازبینی تصاویر" });
    await prisma.product.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } });

    const [beforeAfter, ordinary] = await prisma.productImage.findMany({ where: { productId: id }, orderBy: { sortOrder: "asc" } });
    const slug = (await prisma.product.findUniqueOrThrow({ where: { id } })).slug;

    expect((await getPublishedProduct(slug))?.images.map((i) => i.id)).toEqual([ordinary!.id]);
    expect(await readProductImage(null, beforeAfter!.id)).toBeNull();
    expect(await readProductImage(null, ordinary!.id)).not.toBeNull();
    // The owning importer and admins can still see it while it waits for consent.
    expect(await readProductImage(world.importerViewer, beforeAfter!.id)).not.toBeNull();

    await setImageConsent(world.adminId, beforeAfter!.id, true);
    expect(await readProductImage(null, beforeAfter!.id)).not.toBeNull();
    expect((await getPublishedProduct(slug))?.images.length).toBe(2);
  });

  it("images of unpublished products are not public, and only JPG or PNG is accepted", async () => {
    const id = await createProduct(world.importerA, productInput());
    await addProductImage(world.importerA, id, { alt: "بسته‌بندی محصول", isBeforeAfter: false }, png);
    const image = await prisma.productImage.findFirstOrThrow({ where: { productId: id } });
    expect(await readProductImage(null, image.id)).toBeNull();
    expect(await readProductImage(world.physician, image.id)).toBeNull();
    await expect(
      addProductImage(world.importerA, id, { alt: "فایل نامعتبر", isBeforeAfter: false }, { name: "x.png", bytes: new TextEncoder().encode("%PDF-1.4") }),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      addProductImage(world.importerB, id, { alt: "مال دیگری", isBeforeAfter: false }, png),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("cart: only verified physicians can order", () => {
  it("refuses visitors, pending physicians and importers", async () => {
    const id = await publishedProduct();
    for (const v of [null, world.pendingPhysician, world.importerViewer]) {
      await expect(addToCart(v, id, 1)).rejects.toMatchObject({ code: "forbidden" });
      await expect(checkout(v, shipping)).rejects.toMatchObject({ code: "forbidden" });
    }
    expect(await prisma.cartItem.count()).toBe(0);
    expect(await prisma.order.count()).toBe(0);
  });

  it("adds, updates and removes lines, and refuses unpublished products and bad quantities", async () => {
    const id = await publishedProduct();
    const pending = await createProduct(world.importerA, productInput({ name: "محصول منتظر" }));
    await addToCart(world.physician, id, 2);
    await addToCart(world.physician, id, 1);
    await expect(addToCart(world.physician, pending, 1)).rejects.toMatchObject({ code: "not_found" });
    await expect(addToCart(world.physician, id, 0)).rejects.toMatchObject({ code: "validation_error" });
    await expect(setCartQuantity(world.physician, id, 1000)).rejects.toMatchObject({ code: "validation_error" });

    let cart = await getCart(world.physician.id);
    expect(cart.lines).toMatchObject([{ productId: id, quantity: 3, unitPriceToman: 1500, available: true }]);
    expect(cart.totalToman).toBe(4500);

    await setCartQuantity(world.physician, id, 0);
    cart = await getCart(world.physician.id);
    expect(cart.lines).toEqual([]);
  });
});

describe("checkout and payment", () => {
  async function orderFor(quantity = 2) {
    const productId = await publishedProduct();
    await addToCart(world.physician, productId, quantity);
    const { orderId, redirectUrl } = await checkout(world.physician, shipping);
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId } });
    return { productId, orderId, redirectUrl, authority: payment.authority };
  }

  it("creates an order with copied names and prices, empties the cart and starts a payment", async () => {
    const { productId, orderId, redirectUrl, authority } = await orderFor(2);
    expect(redirectUrl).toBe(`/mock-gateway/${authority}`);
    const order = await getOrderForUser(world.physician.id, orderId);
    expect(order).toMatchObject({ status: "PENDING_PAYMENT", totalToman: 3000, postalCode: "1234567890", phone: "09121234567" });
    expect(order?.number).toMatch(/^BM\d{8}$/);
    expect((await getCart(world.physician.id)).lines).toEqual([]);

    // A later price or name change does not alter the order.
    await updateProduct(world.importerA, productId, productInput({ name: "نام تازه", priceToman: "9999" }));
    const after = await getOrderForUser(world.physician.id, orderId);
    expect(after?.totalToman).toBe(3000);
    expect(after?.items[0]).toMatchObject({ productName: "محصول آزمایشی", unitPriceToman: 1500, quantity: 2 });
  });

  it("two checkouts of the same cart at the same moment create one order", async () => {
    const productId = await publishedProduct();
    await addToCart(world.physician, productId, 1);
    const results = await Promise.allSettled([checkout(world.physician, shipping), checkout(world.physician, shipping)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.order.count()).toBe(1);
    expect(await prisma.payment.count()).toBe(1);
  });

  it("refuses an empty cart and invalid shipping details", async () => {
    await expect(checkout(world.physician, shipping)).rejects.toMatchObject({ code: "validation_error" });
    const productId = await publishedProduct();
    await addToCart(world.physician, productId, 1);
    await expect(checkout(world.physician, { ...shipping, postalCode: "123" })).rejects.toMatchObject({
      code: "validation_error",
      fields: { postalCode: expect.any(String) },
    });
    expect(await prisma.order.count()).toBe(0);
  });

  it("marks the order paid once, however many times the callback arrives", async () => {
    const { orderId, authority } = await orderFor();
    const results = await Promise.all([
      confirmPayment(authority, { status: "OK" }),
      confirmPayment(authority, { status: "OK" }),
      confirmPayment(authority, { status: "OK" }),
    ]);
    expect(results.every((r) => r?.paid === true && r.orderId === orderId)).toBe(true);
    expect(await confirmPayment(authority, { status: "NOK" })).toEqual({ orderId, paid: true });

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true } });
    expect(order.status).toBe("PAID");
    expect(order.paidAt).not.toBeNull();
    expect(order.payments.filter((p) => p.status === "SUCCEEDED")).toHaveLength(1);
    expect(await prisma.auditLog.count({ where: { action: "order.paid", entityId: orderId } })).toBe(1);
  });

  it("a cancelled payment leaves the order waiting, and it can be paid again", async () => {
    const { orderId, authority } = await orderFor();
    expect(await confirmPayment(authority, { status: "NOK" })).toEqual({ orderId, paid: false });
    // A failed attempt cannot be turned into a success afterwards.
    expect(await confirmPayment(authority, { status: "OK" })).toEqual({ orderId, paid: false });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PENDING_PAYMENT");

    const retryUrl = await payOrder(world.physician, orderId);
    const retryAuthority = retryUrl.split("/").pop()!;
    expect(await confirmPayment(retryAuthority, { status: "OK" })).toEqual({ orderId, paid: true });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PAID");
    await expect(payOrder(world.physician, orderId)).rejects.toMatchObject({ code: "not_found" });
  });

  it("ignores unknown payment references", async () => {
    expect(await confirmPayment("mock_does_not_exist", { status: "OK" })).toBeNull();
  });

  it("orders are visible to their owner only; importers see only paid lines of their own products", async () => {
    const mine = await publishedProduct(world.importerA, { name: "محصول شرکت الف" });
    const theirs = await publishedProduct(world.importerB, { name: "محصول شرکت ب" });
    await addToCart(world.physician, mine, 1);
    await addToCart(world.physician, theirs, 3);
    const { orderId } = await checkout(world.physician, shipping);

    expect(await getOrderForUser(world.pendingPhysician.id, orderId)).toBeNull();
    expect(await listOrderItemsForImporter(world.importerA)).toEqual([]); // not paid yet

    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId } });
    await confirmPayment(payment.authority, { status: "OK" });
    const a = await listOrderItemsForImporter(world.importerA);
    const b = await listOrderItemsForImporter(world.importerB);
    expect(a.map((i) => [i.productName, i.quantity])).toEqual([["محصول شرکت الف", 1]]);
    expect(b.map((i) => [i.productName, i.quantity])).toEqual([["محصول شرکت ب", 3]]);
    // Buyer contact details are not part of what an importer receives.
    expect(JSON.stringify(a)).not.toContain("09121234567");

    await markOrderFulfilled(world.adminId, orderId);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("FULFILLED");
    await expect(markOrderFulfilled(world.adminId, orderId)).rejects.toMatchObject({ code: "not_found" });
  });
});
