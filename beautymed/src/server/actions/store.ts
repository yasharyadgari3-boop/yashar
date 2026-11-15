"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/ui/action-form";
import { MAX_DOCUMENT_BYTES } from "@/lib/upload";
import { getCurrentUser } from "@/server/auth/session";
import { toFormState, ValidationError } from "@/server/errors";
import { actionAdmin, actionVerifiedImporter } from "@/server/guards";
import { addToCart, setCartQuantity } from "@/server/services/cart";
import { checkout, markOrderFulfilled, payOrder } from "@/server/services/orders";
import {
  addProductImage,
  createProduct,
  removeProductImage,
  reviewProduct,
  setImageConsent,
  updateProduct,
} from "@/server/services/products";
import { createProposal, markProposalReviewed } from "@/server/services/proposals";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/* ---------------- Importer ---------------- */

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let productId = text(formData, "productId");
  try {
    const importer = await actionVerifiedImporter();
    const input = {
      name: text(formData, "name"),
      description: text(formData, "description"),
      categoryId: text(formData, "categoryId"),
      priceToman: text(formData, "priceToman"),
      ircCode: text(formData, "ircCode"),
      importerName: text(formData, "importerName"),
      authenticityDetails: text(formData, "authenticityDetails"),
    };
    if (productId) await updateProduct(importer.importerProfileId, productId, input);
    else productId = await createProduct(importer.importerProfileId, input);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/dashboard/importer/products", "layout");
  redirect(`/dashboard/importer/products/${productId}?saved=1`);
}

export async function addProductImageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const importer = await actionVerifiedImporter();
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) throw new ValidationError("تصویر را انتخاب کنید.", { image: "تصویر را انتخاب کنید." });
    if (file.size > MAX_DOCUMENT_BYTES) throw new ValidationError("تصویر پذیرفته نشد.", { image: "حجم فایل باید کمتر از ۵ مگابایت باشد." });
    await addProductImage(
      importer.importerProfileId,
      text(formData, "productId"),
      { alt: text(formData, "alt"), isBeforeAfter: formData.get("isBeforeAfter") === "on" },
      { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
    );
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/dashboard/importer/products", "layout");
  return { ok: true, message: "تصویر اضافه شد." };
}

export async function removeProductImageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const importer = await actionVerifiedImporter();
    await removeProductImage(importer.importerProfileId, text(formData, "imageId"));
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/dashboard/importer/products", "layout");
  return { ok: true, message: "تصویر حذف شد." };
}

export async function submitProposalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const importer = await actionVerifiedImporter();
    await createProposal(importer.importerProfileId, { subject: text(formData, "subject"), message: text(formData, "message") });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/dashboard/importer/proposals");
  return { ok: true, message: "پیشنهاد شما ثبت شد و مدیر سایت آن را بررسی می‌کند." };
}

/* ---------------- Admin ---------------- */

export async function reviewProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await actionAdmin();
    await reviewProduct(admin.id, {
      productId: text(formData, "productId"),
      decision: text(formData, "decision"),
      reason: text(formData, "reason") || undefined,
    });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: formData.get("decision") === "publish" ? "محصول منتشر شد." : "محصول رد شد." };
}

export async function setImageConsentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await actionAdmin();
    await setImageConsent(admin.id, text(formData, "imageId"), formData.get("consent") === "on");
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "ذخیره شد." };
}

export async function markProposalReviewedAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await actionAdmin();
    await markProposalReviewed(text(formData, "proposalId"));
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/dashboard/admin/proposals");
  return { ok: true, message: "ثبت شد." };
}

export async function markFulfilledAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await actionAdmin();
    await markOrderFulfilled(admin.id, text(formData, "orderId"));
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/dashboard/admin/orders");
  return { ok: true, message: "سفارش ارسال‌شده ثبت شد." };
}

/* ---------------- Physician: cart and checkout ---------------- */
/* The services check that the viewer is a verified physician; the UI hiding a button is not the control. */

export async function addToCartAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await addToCart(await getCurrentUser(), text(formData, "productId"), text(formData, "quantity") || 1);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/cart");
  redirect("/cart");
}

export async function updateCartAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const quantity = formData.get("remove") ? 0 : text(formData, "quantity");
    await setCartQuantity(await getCurrentUser(), text(formData, "productId"), quantity);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/cart");
  return { ok: true };
}

export async function checkoutAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let redirectUrl: string;
  try {
    const result = await checkout(await getCurrentUser(), {
      recipientName: text(formData, "recipientName"),
      phone: text(formData, "phone"),
      city: text(formData, "city"),
      address: text(formData, "address"),
      postalCode: text(formData, "postalCode"),
      note: text(formData, "note") || undefined,
    });
    redirectUrl = result.redirectUrl;
  } catch (error) {
    return toFormState(error);
  }
  redirect(redirectUrl);
}

export async function payOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let redirectUrl: string;
  try {
    redirectUrl = await payOrder(await getCurrentUser(), text(formData, "orderId"));
  } catch (error) {
    return toFormState(error);
  }
  redirect(redirectUrl);
}
