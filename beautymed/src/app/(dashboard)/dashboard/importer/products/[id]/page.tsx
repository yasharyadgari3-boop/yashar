import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProductImage, ProductStatusBadge } from "@/components/shop/product-card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Select, TextArea } from "@/components/ui/field";
import { addProductImageAction, removeProductImageAction, saveProductAction } from "@/server/actions/store";
import { requireRole } from "@/server/auth/session";
import { canSubmitProducts } from "@/server/rbac/permissions";
import { getImporterProduct, listCategories } from "@/server/services/products";

export const metadata: Metadata = { title: "ثبت محصول" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

export default async function ImporterProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const user = await requireRole("IMPORTER", `/dashboard/importer/products/${id}`);
  if (!canSubmitProducts(user) || !user.importerProfileId) notFound();

  const isNew = id === "new";
  const [product, categories, { saved }] = await Promise.all([
    isNew ? null : getImporterProduct(user.importerProfileId, id),
    listCategories(),
    searchParams,
  ]);
  // Another importer's product looks exactly like one that does not exist.
  if (!isNew && !product) notFound();

  return (
    <DashboardShell user={user} title={isNew ? "ثبت محصول تازه" : "ویرایش محصول"} currentHref="/dashboard/importer/products">
      {saved ? (
        <p role="status" className="mb-8 border border-line bg-alt px-4 py-3">
          محصول ذخیره شد و برای بررسی مدیر سایت فرستاده شد.
        </p>
      ) : null}
      {product ? (
        <p className="mb-6 flex flex-wrap items-center gap-3">
          <ProductStatusBadge status={product.status} />
          {product.status === "REJECTED" && product.rejectionReason ? <span>دلیل رد: {product.rejectionReason}</span> : null}
          {product.status === "PUBLISHED" ? <span className="text-muted">هر ویرایش، محصول را دوباره به بررسی می‌فرستد.</span> : null}
        </p>
      ) : null}

      <ActionForm action={saveProductAction} className="max-w-2xl">
        <input type="hidden" name="productId" value={product?.id ?? ""} />
        <div className="space-y-5">
          <Field label="نام محصول (نام برند به لاتین)" name="name" required maxLength={120} defaultValue={product?.name ?? ""} />
          <Select label="دسته" name="categoryId" required defaultValue={product?.categoryId ?? ""}>
            <option value="">انتخاب کنید</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
          <Field
            label="قیمت (تومان)"
            name="priceToman"
            required
            inputMode="numeric"
            dir="ltr"
            maxLength={14}
            defaultValue={product ? String(product.priceToman) : ""}
          />
          <TextArea label="توضیح محصول" name="description" required rows={6} maxLength={5000} defaultValue={product?.description ?? ""} hint="توضیح باید اطلاع‌رسان باشد و هیچ نتیجه‌ای را وعده ندهد." />

          <fieldset className="space-y-5 border-t border-gold pt-5">
            <legend className="text-xl">ثبت و اصالت</legend>
            <p className="text-muted">بدون این اطلاعات، مدیر سایت نمی‌تواند محصول را منتشر کند.</p>
            <Field label="کد ثبت سازمان غذا و دارو (IRC)" name="ircCode" dir="ltr" maxLength={60} defaultValue={product?.compliance?.ircCode ?? ""} />
            <Field label="نام واردکننده" name="importerName" maxLength={120} defaultValue={product?.compliance?.importerName ?? user.displayName ?? ""} />
            <TextArea label="مشخصات اصالت (مثل برچسب اصالت و روش استعلام)" name="authenticityDetails" rows={3} maxLength={1000} defaultValue={product?.compliance?.authenticityDetails ?? ""} />
          </fieldset>

          <SubmitButton>{isNew ? "ثبت و ارسال برای بررسی" : "ذخیره و ارسال دوباره برای بررسی"}</SubmitButton>
        </div>
      </ActionForm>

      {product ? (
        <section aria-labelledby="images-title" className="mt-14 max-w-2xl border-t border-line pt-8">
          <h2 id="images-title" className="text-2xl">
            تصاویر محصول
          </h2>
          {product.images.length === 0 ? <p className="mt-3 text-muted">هنوز تصویری بارگذاری نشده است.</p> : null}
          <ul className="mt-4 grid gap-6 sm:grid-cols-2">
            {product.images.map((image) => (
              <li key={image.id} className="border border-line p-3">
                <div className="aspect-[3/2] overflow-hidden">
                  <ProductImage id={image.id} alt={image.alt} />
                </div>
                <p className="mt-2 text-sm text-muted">{image.alt}</p>
                {image.isBeforeAfter ? (
                  <p className="text-sm">
                    تصویر قبل و بعد: {image.patientConsent ? "رضایت بیمار ثبت شده است." : "تا ثبت رضایت بیمار توسط مدیر نمایش داده نمی‌شود."}
                  </p>
                ) : null}
                <ActionForm action={removeProductImageAction} className="mt-2">
                  <input type="hidden" name="imageId" value={image.id} />
                  <SubmitButton variant="secondary" pendingLabel="…">
                    حذف تصویر
                  </SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>

          <ActionForm action={addProductImageAction} className="mt-8">
            <input type="hidden" name="productId" value={product.id} />
            <div className="space-y-5">
              <Field label="افزودن تصویر" name="image" required type="file" accept=".jpg,.jpeg,.png" hint="JPG یا PNG، حداکثر ۵ مگابایت." />
              <Field label="متن جایگزین تصویر (برای نابینایان)" name="alt" required maxLength={200} />
              <Checkbox name="isBeforeAfter" label="این تصویر «قبل و بعد» از یک بیمار است (فقط با ثبت رضایت بیمار توسط مدیر نمایش داده می‌شود)." />
              <SubmitButton variant="secondary">بارگذاری تصویر</SubmitButton>
            </div>
          </ActionForm>
        </section>
      ) : null}
    </DashboardShell>
  );
}
