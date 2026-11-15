import "server-only";
import { cartTotal, MAX_QUANTITY } from "@/lib/compliance";
import { prisma } from "@/server/db";
import { AppError, NotFoundError, ValidationError } from "@/server/errors";
import { canOrder, type Viewer } from "@/server/rbac/permissions";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  unitPriceToman: number;
  quantity: number;
  /** False when the product was unpublished after it was added. */
  available: boolean;
};

function assertCanOrder(viewer: Viewer): asserts viewer is NonNullable<Viewer> {
  if (!canOrder(viewer)) throw new AppError("ثبت سفارش فقط با حساب پزشک تأییدشده ممکن است.", "forbidden", 403);
}

function parseQuantity(value: unknown, min: number): number {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < min || quantity > MAX_QUANTITY) {
    throw new ValidationError(`تعداد باید عددی بین ${min} و ${MAX_QUANTITY} باشد.`);
  }
  return quantity;
}

export async function getCart(userId: string): Promise<{ lines: CartLine[]; totalToman: number }> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: {
      items: {
        orderBy: { id: "asc" },
        select: {
          quantity: true,
          product: { select: { id: true, slug: true, name: true, priceToman: true, status: true, deletedAt: true } },
        },
      },
    },
  });
  const lines: CartLine[] = (cart?.items ?? []).map((item) => ({
    productId: item.product.id,
    slug: item.product.slug,
    name: item.product.name,
    unitPriceToman: item.product.priceToman,
    quantity: item.quantity,
    available: item.product.status === "PUBLISHED" && item.product.deletedAt === null,
  }));
  return { lines, totalToman: cartTotal(lines.filter((l) => l.available)) };
}

/** Only verified physicians can add to a cart, and only published products. */
export async function addToCart(viewer: Viewer, productId: string, quantityInput: unknown = 1): Promise<void> {
  assertCanOrder(viewer);
  const quantity = parseQuantity(quantityInput, 1);
  const product = await prisma.product.findFirst({
    where: { id: productId, status: "PUBLISHED", deletedAt: null },
    select: { id: true },
  });
  if (!product) throw new NotFoundError("این محصول در دسترس نیست.");

  const cart = await prisma.cart.upsert({ where: { userId: viewer.id }, create: { userId: viewer.id }, update: {}, select: { id: true } });
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
    select: { quantity: true },
  });
  const next = Math.min((existing?.quantity ?? 0) + quantity, MAX_QUANTITY);
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity: next },
    update: { quantity: next },
  });
}

/** Set a line's quantity; zero removes it. */
export async function setCartQuantity(viewer: Viewer, productId: string, quantityInput: unknown): Promise<void> {
  assertCanOrder(viewer);
  const quantity = parseQuantity(quantityInput, 0);
  const cart = await prisma.cart.findUnique({ where: { userId: viewer.id }, select: { id: true } });
  if (!cart) return;
  if (quantity === 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  } else {
    await prisma.cartItem.updateMany({ where: { cartId: cart.id, productId }, data: { quantity } });
  }
}
