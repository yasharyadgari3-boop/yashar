import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProductImage, ProductStatusBadge } from "@/components/shop/product-card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { complianceFieldLabels, missingComplianceFields } from "@/lib/compliance";
import { formatToman } from "@/lib/format";
import { reviewProductAction, setImageConsentAction } from "@/server/actions/store";
import { requireRole } from "@/server/auth/session";
import { listProductsForReview } from "@/server/services/products";
import { getSetting } from "@/server/services/settings";

export const metadata: Metadata = { title: "بررسی محصولات" };

export default async function AdminProductsPage() {
  const user = await requireRole("ADMIN", "/dashboard/admin/products");
  const [products, required] = await Promise.all([listProductsForReview(), getSetting("complianceRequiredFields")]);

  return (
    <DashboardShell user={user} title="بررسی محصولات" currentHref="/dashboard/admin/products">
      {products.length === 0 ? <p className="text-lg text-muted">محصولی ثبت نشده است.</p> : null}
      <ul className="space-y-6">
        {products.map((p) => {
          const missing = missingComplianceFields(p.compliance, required);
          return (
            <li key={p.id} className="border border-line p-6" data-testid={`product-${p.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl">{p.name}</h2>
                <ProductStatusBadge status={p.status} />
              </div>
              <dl className="mt-3 space-y-1 text-base">
                <div className="flex gap-2">
                  <dt className="text-muted">شرکت:</dt>
                  <dd>{p.importer.companyName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">دسته:</dt>
                  <dd>{p.category.title}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">قیمت:</dt>
                  <dd>{formatToman(p.priceToman)}</dd>
                </div>
                {Object.entries(complianceFieldLabels).map(([field, label]) => (
                  <div key={field} className="flex gap-2">
                    <dt className="text-muted">{label}:</dt>
                    <dd>{p.compliance?.[field as keyof typeof p.compliance] || "— (خالی)"}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 whitespace-pre-line text-muted">{p.description}</p>

              {p.images.length > 0 ? (
                <ul className="mt-4 grid gap-4 sm:grid-cols-3">
                  {p.images.map((image) => (
                    <li key={image.id} className="border border-line p-2">
                      <div className="aspect-[3/2] overflow-hidden">
                        <ProductImage id={image.id} alt={image.alt} />
                      </div>
                      {image.isBeforeAfter ? (
                        <ActionForm action={setImageConsentAction} className="mt-2">
                          <input type="hidden" name="imageId" value={image.id} />
                          <label htmlFor={`consent-${image.id}`} className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm">
                            <input
                              id={`consent-${image.id}`}
                              name="consent"
                              type="checkbox"
                              defaultChecked={image.patientConsent}
                              className="mt-1 size-5 shrink-0 accent-ink"
                            />
                            <span>رضایت کتبی بیمار برای انتشار این تصویر قبل و بعد دریافت شده است.</span>
                          </label>
                          <SubmitButton variant="secondary" pendingLabel="…">
                            ذخیره
                          </SubmitButton>
                        </ActionForm>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {missing.length > 0 ? (
                <p className="mt-4 border-2 border-ink px-4 py-3">
                  قابل انتشار نیست. موارد خالی: {missing.map((f) => complianceFieldLabels[f] ?? f).join("، ")}
                </p>
              ) : null}
              {p.status === "REJECTED" && p.rejectionReason ? <p className="mt-3">دلیل رد: {p.rejectionReason}</p> : null}

              {p.status === "PENDING" || p.status === "PUBLISHED" ? (
                <ActionForm action={reviewProductAction} className="mt-4">
                  <input type="hidden" name="productId" value={p.id} />
                  <label htmlFor={`reason-${p.id}`} className="mb-1.5 block text-base">
                    دلیل رد (فقط برای رد کردن لازم است)
                  </label>
                  <textarea
                    id={`reason-${p.id}`}
                    name="reason"
                    rows={2}
                    maxLength={500}
                    className="block w-full rounded-sm border border-muted bg-bg px-3 py-2 text-base"
                  />
                  <div className="mt-3 flex flex-wrap gap-3">
                    {p.status === "PENDING" ? (
                      <SubmitButton name="decision" value="publish">
                        انتشار
                      </SubmitButton>
                    ) : null}
                    <SubmitButton name="decision" value="reject" variant="secondary">
                      {p.status === "PUBLISHED" ? "برداشتن از فروشگاه" : "رد"}
                    </SubmitButton>
                  </div>
                </ActionForm>
              ) : null}
            </li>
          );
        })}
      </ul>
    </DashboardShell>
  );
}
