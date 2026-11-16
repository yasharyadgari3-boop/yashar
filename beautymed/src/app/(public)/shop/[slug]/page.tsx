import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceText, ProductImage, ProductImageFallback } from "@/components/shop/product-card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { addToCartAction } from "@/server/actions/store";
import { getCurrentUser } from "@/server/auth/session";
import { canOrder, canSeePrices } from "@/server/rbac/permissions";
import { getPublishedProduct } from "@/server/services/products";
import { getSetting } from "@/server/services/settings";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const product = await getPublishedProduct(slug);
  return { title: product?.name, alternates: { canonical: `/shop/${encodeURIComponent(slug)}` } };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, viewer, visitorsSeePrices] = await Promise.all([
    getPublishedProduct(slug),
    getCurrentUser(),
    getSetting("visitorsSeePrices"),
  ]);
  if (!product) notFound();
  const [first, ...rest] = product.images;

  return (
    <Container className="py-14 md:py-20">
      <nav aria-label="مسیر صفحه" className="mb-8 text-base text-muted">
        <Link href="/shop" className="link inline-flex min-h-11 items-center">
          فروشگاه
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href={`/shop?category=${product.category.slug}`} className="link inline-flex min-h-11 items-center">
          {product.category.title}
        </Link>
      </nav>

      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <div className="aspect-[3/2] overflow-hidden border border-line">
            {first ? <ProductImage id={first.id} alt={first.alt} /> : <ProductImageFallback />}
          </div>
          {rest.length > 0 ? (
            <ul className="mt-4 grid grid-cols-3 gap-4">
              {rest.map((image) => (
                <li key={image.id} className="aspect-[3/2] overflow-hidden border border-line">
                  <ProductImage id={image.id} alt={image.alt} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          <span aria-hidden="true" className="gold-rule mb-6" />
          <h1 className="text-4xl md:text-5xl">{product.name}</h1>
          <p className="mt-5 text-xl">
            <PriceText priceToman={product.priceToman} visible={canSeePrices(viewer, visitorsSeePrices)} />
          </p>

          <div className="mt-8">
            {canOrder(viewer) ? (
              <ActionForm action={addToCartAction}>
                <input type="hidden" name="productId" value={product.id} />
                <SubmitButton pendingLabel="در حال افزودن…">افزودن به سبد خرید</SubmitButton>
              </ActionForm>
            ) : (
              <div className="border border-line bg-alt p-5">
                <p>ثبت سفارش فقط با حساب پزشک تأییدشده ممکن است.</p>
                <div className="mt-4">
                  {viewer ? (
                    <ButtonLink href="/dashboard" variant="secondary">
                      وضعیت تأیید حساب من
                    </ButtonLink>
                  ) : (
                    <ButtonLink href={`/login?next=/shop/${product.slug}`} variant="secondary">
                      ورود پزشکان
                    </ButtonLink>
                  )}
                </div>
              </div>
            )}
          </div>

          <section aria-labelledby="compliance-title" className="mt-10 border-t border-gold pt-6">
            <h2 id="compliance-title" className="text-2xl">
              ثبت و اصالت
            </h2>
            <dl className="mt-4 space-y-3 text-base">
              <div>
                <dt className="text-muted">کد ثبت سازمان غذا و دارو (IRC)</dt>
                <dd>{product.compliance?.ircCode || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">واردکننده</dt>
                <dd>{product.compliance?.importerName || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">مشخصات اصالت</dt>
                <dd className="whitespace-pre-line">{product.compliance?.authenticityDetails || "—"}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <section aria-labelledby="description-title" className="mt-16 max-w-3xl">
        <h2 id="description-title" className="text-2xl">
          توضیحات
        </h2>
        <p className="mt-4 whitespace-pre-line text-ink">{product.description}</p>
        <p className="mt-6 text-sm text-muted">
          اطلاعات این صفحه را شرکت واردکننده ثبت کرده و مدیر سایت بررسی کرده است. این توضیحات جنبه‌ی اطلاع‌رسانی دارد و
          هیچ نتیجه‌ای را وعده نمی‌دهد.
        </p>
      </section>
    </Container>
  );
}
