import "server-only";
import { getCurrentUser, type CurrentUser } from "@/server/auth/session";
import { AppError, NotFoundError } from "@/server/errors";
import { canOrder, canSubmitProducts, isAdmin } from "@/server/rbac/permissions";

/** Guards for Server Actions and route handlers: they throw instead of redirecting. */
export async function actionUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("ابتدا وارد حساب خود شوید.", "unauthorized", 401);
  return user;
}

/** Non-admins get "not found", so admin actions are not revealed. */
export async function actionAdmin(): Promise<CurrentUser> {
  const user = await actionUser();
  if (!isAdmin(user)) throw new NotFoundError();
  return user;
}

export async function actionVerifiedPhysician(): Promise<CurrentUser> {
  const user = await actionUser();
  if (!canOrder(user)) {
    throw new AppError("ثبت سفارش فقط با حساب پزشک تأییدشده ممکن است.", "forbidden", 403);
  }
  return user;
}

export async function actionVerifiedImporter(): Promise<CurrentUser & { importerProfileId: string }> {
  const user = await actionUser();
  if (!canSubmitProducts(user) || !user.importerProfileId) {
    throw new AppError("این بخش فقط برای شرکت‌های واردکننده‌ی تأییدشده است.", "forbidden", 403);
  }
  return { ...user, importerProfileId: user.importerProfileId };
}
