import "server-only";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { cartTotal } from "@/lib/compliance";
import { mobileSchema, fieldErrors } from "@/lib/validators";
import { toLatinDigits } from "@/lib/persian-text";
import { Prisma } from "@/generated/prisma/client";
import { getPaymentGateway } from "@/server/adapters/payment";
import { prisma } from "@/server/db";
import { AppError, NotFoundError, ValidationError } from "@/server/errors";
import { canOrder, type Viewer } from "@/server/rbac/permissions";
import { audit } from "@/server/services/audit";

export const shippingSchema = z.object({
  recipientName: z.string().trim().min(2, "نام گیرنده را وارد کنید.").max(100),
  phone: mobileSchema,
  city: z.string().trim().min(2, "شهر را وارد کنید.").max(60),
  address: z.string().trim().min(10, "نشانی کامل را وارد کنید.").max(500),
  postalCode: z
    .string()
    .trim()
    .transform((v) => toLatinDigits(v).replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد.")),
  note: z.string().trim().max(500).optional(),
});

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function newOrderNumber(): string {
  return `BM${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
}

function assertCanOrder(viewer: Viewer): asserts viewer is NonNullable<Viewer> {
  if (!canOrder(viewer)) throw new AppError("ثبت سفارش فقط با حساب پزشک تأییدشده ممکن است.", "forbidden", 403);
}

/** Ask the gateway for a payment and record the attempt. Runs outside any transaction. */
async function startPayment(order: { id: string; number: string; totalToman: number }): Promise<string> {
  const gateway = getPaymentGateway();
  const { authority, redirectUrl } = await gateway.startPayment({
    orderNumber: order.number,
    amountToman: order.totalToman,
    callbackUrl: `${appUrl()}/api/v1/payments/callback`,
    description: `سفارش ${order.number}`,
  });
  await prisma.payment.create({
    data: { orderId: order.id, gateway: gateway.name, authority, amountToman: order.totalToman },
  });
  return redirectUrl;
}

/**
 * Turn the cart into an order. Names and prices are copied into the order, the cart is
 * emptied in the same transaction, and only then is the gateway called.
 */
export async function checkout(viewer: Viewer, shippingInput: unknown): Promise<{ orderId: string; redirectUrl: string }> {
  assertCanOrder(viewer);
  const parsed = shippingSchema.safeParse(shippingInput);
  if (!parsed.success) throw new ValidationError("اطلاعات واردشده را بررسی کنید.", fieldErrors(parsed.error));
  const shipping = { ...parsed.data, note: parsed.data.note || null };

  const cart = await prisma.cart.findUnique({
    where: { userId: viewer.id },
    select: {
      id: true,
      items: {
        select: {
          quantity: true,
          product: { select: { id: true, name: true, priceToman: true, importerId: true, status: true, deletedAt: true } },
        },
      },
    },
  });
  const items = (cart?.items ?? []).filter((i) => i.product.status === "PUBLISHED" && i.product.deletedAt === null);
  if (!cart || items.length === 0) throw new ValidationError("سبد خرید شما خالی است.");

  const lines = items.map((i) => ({
    productId: i.product.id,
    importerId: i.product.importerId,
    productName: i.product.name,
    unitPriceToman: i.product.priceToman,
    quantity: i.quantity,
  }));
  const totalToman = cartTotal(lines);

  let order: { id: string; number: string; totalToman: number } | undefined;
  for (let attempt = 0; attempt < 3 && !order; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        // Empty the cart first and check that it still holds what was priced above. If a second
        // checkout for the same cart runs at the same time, it finds nothing left and stops, so
        // one cart can never become two orders.
        const removed = await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        if (removed.count !== cart.items.length) {
          throw new ValidationError("سبد خرید شما تغییر کرده است. آن را دوباره بررسی کنید.");
        }
        return tx.order.create({
          data: { number: newOrderNumber(), userId: viewer.id, totalToman, ...shipping, items: { create: lines } },
          select: { id: true, number: true, totalToman: true },
        });
      });
      order = created;
    } catch (error) {
      // Retry only when the random order number collided.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }
  if (!order) throw new AppError("ثبت سفارش ممکن نشد. دوباره تلاش کنید.", "order_number_conflict", 500);

  await audit({ actorId: viewer.id, action: "order.created", entity: "Order", entityId: order.id, meta: { totalToman } });
  return { orderId: order.id, redirectUrl: await startPayment(order) };
}

/** Pay an order that is still waiting for payment (for example after a cancelled attempt). */
export async function payOrder(viewer: Viewer, orderId: string): Promise<string> {
  assertCanOrder(viewer);
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: viewer.id, status: "PENDING_PAYMENT" },
    select: { id: true, number: true, totalToman: true },
  });
  if (!order) throw new NotFoundError("سفارشی در انتظار پرداخت پیدا نشد.");
  return startPayment(order);
}

export type PaymentOutcome = { orderId: string; paid: boolean };

/**
 * Called when the gateway sends the buyer back. Idempotent: the payment row moves from
 * INITIATED exactly once, so repeating the callback (refresh, retry, replay) never pays an
 * order twice. The gateway is asked to verify before anything is marked paid.
 */
export async function confirmPayment(authority: string, callbackParams: Record<string, string>): Promise<PaymentOutcome | null> {
  const payment = await prisma.payment.findUnique({
    where: { authority },
    select: { id: true, status: true, amountToman: true, orderId: true },
  });
  if (!payment) return null;
  if (payment.status === "SUCCEEDED") return { orderId: payment.orderId, paid: true };
  if (payment.status === "FAILED") return { orderId: payment.orderId, paid: false };

  const result = await getPaymentGateway().verifyPayment({ authority, amountToman: payment.amountToman, callbackParams });
  const now = new Date();

  if (!result.ok) {
    await prisma.payment.updateMany({ where: { id: payment.id, status: "INITIATED" }, data: { status: "FAILED", verifiedAt: now } });
    return { orderId: payment.orderId, paid: false };
  }

  const paid = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "INITIATED" },
      data: { status: "SUCCEEDED", refId: result.refId, verifiedAt: now },
    });
    if (claimed.count === 0) return false; // another request already handled this callback
    await tx.order.updateMany({
      where: { id: payment.orderId, status: "PENDING_PAYMENT" },
      data: { status: "PAID", paidAt: now },
    });
    return true;
  });
  if (paid) await audit({ actorId: null, action: "order.paid", entity: "Order", entityId: payment.orderId });
  const current = await prisma.payment.findUnique({ where: { id: payment.id }, select: { status: true } });
  return { orderId: payment.orderId, paid: current?.status === "SUCCEEDED" };
}

const orderSelect = {
  id: true,
  number: true,
  status: true,
  totalToman: true,
  recipientName: true,
  phone: true,
  city: true,
  address: true,
  postalCode: true,
  note: true,
  createdAt: true,
  paidAt: true,
  items: { orderBy: { id: "asc" as const }, select: { id: true, productName: true, unitPriceToman: true, quantity: true, importerId: true } },
  payments: { orderBy: { createdAt: "desc" as const }, select: { status: true, refId: true, gateway: true } },
};

export function listOrdersForUser(userId: string) {
  return prisma.order.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100, select: orderSelect });
}

/** Null when the order does not exist or belongs to someone else (the page answers 404). */
export function getOrderForUser(userId: string, orderId: string) {
  return prisma.order.findFirst({ where: { id: orderId, userId }, select: orderSelect });
}

/** Paid order lines for one importer's products only; other importers' lines and buyer contact details are not included. */
export function listOrderItemsForImporter(importerId: string) {
  return prisma.orderItem.findMany({
    where: { importerId, order: { status: { in: ["PAID", "FULFILLED"] } } },
    orderBy: [{ order: { createdAt: "desc" } }, { id: "desc" }],
    take: 200,
    select: {
      id: true,
      productName: true,
      unitPriceToman: true,
      quantity: true,
      order: { select: { number: true, status: true, createdAt: true, city: true } },
    },
  });
}

export function listAllOrders() {
  return prisma.order.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
    select: { ...orderSelect, user: { select: { mobile: true, physician: { select: { fullName: true } } } } },
  });
}

export async function markOrderFulfilled(adminId: string, orderId: string): Promise<void> {
  const done = await prisma.order.updateMany({ where: { id: orderId, status: "PAID" }, data: { status: "FULFILLED" } });
  if (done.count === 0) throw new NotFoundError("فقط سفارش پرداخت‌شده را می‌توان ارسال‌شده ثبت کرد.");
  await audit({ actorId: adminId, action: "order.fulfilled", entity: "Order", entityId: orderId });
}
