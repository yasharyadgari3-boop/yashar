import Link from "next/link";
import { formatToman } from "@/lib/format";
import type { ProductCard as ProductCardData } from "@/server/services/products";

const orderStatusText = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  FULFILLED: "ارسال‌شده",
  CANCELLED: "لغوشده",
} as const;

export function OrderStatusBadge({ status }: { status: keyof typeof orderStatusText }) {
  return <span className="inline-block rounded-sm border border-line bg-alt px-2.5 py-0.5 text-sm text-ink">{orderStatusText[status]}</span>;
}

const productStatusText = { DRAFT: "پیش‌نویس", PENDING: "در انتظار بررسی", PUBLISHED: "منتشرشده", REJECTED: "ردشده" } as const;

export function ProductStatusBadge({ status }: { status: keyof typeof productStatusText }) {
  return <span className="inline-block rounded-sm border border-line bg-alt px-2.5 py-0.5 text-sm text-ink">{productStatusText[status]}</span>;
}

/** Product image served through the access-checked image route (plain <img>: the files are private storage, not /public). */
export function ProductImage({ id, alt, className = "" }: { id: string; alt: string; className?: string }) {
  const src = `/api/product-images/${id}`;
  // eslint-disable-next-line @next/next/no-img-element -- served by an access-checked route, not next/image
  return <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
}

/** Where there is no image yet, a labeled slot is shown instead of a stock photo. */
export function ProductImageFallback() {
  return (
    <div className="flex h-full items-end bg-alt p-4 text-sm text-muted">تصویر محصول هنوز بارگذاری نشده است.</div>
  );
}

export function PriceText({ priceToman, visible }: { priceToman: number; visible: boolean }) {
  return visible ? (
    <span className="text-ink">{formatToman(priceToman)}</span>
  ) : (
    <span className="text-muted">قیمت برای حساب‌های تأییدشده نمایش داده می‌شود.</span>
  );
}

export function ProductCard({ product, showPrice }: { product: ProductCardData; showPrice: boolean }) {
  return (
    <Link href={`/shop/${product.slug}`} className="card-zoom group block">
      <div className="card-zoom-media aspect-[3/2] overflow-hidden border border-line">
        {product.image ? <ProductImage id={product.image.id} alt={product.image.alt} /> : <ProductImageFallback />}
      </div>
      <span className="mt-4 block text-sm text-muted">{product.categoryTitle}</span>
      <span className="block text-xl group-hover:underline">{product.name}</span>
      <span className="mt-1 block text-base">
        <PriceText priceToman={product.priceToman} visible={showPrice} />
      </span>
    </Link>
  );
}
