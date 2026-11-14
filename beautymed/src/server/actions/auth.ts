"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/ui/action-form";
import { mobileSchema, otpCodeSchema } from "@/lib/validators";
import { requestOtp, verifyOtp } from "@/server/auth/otp";
import { createSession, destroySession, findUserBySessionToken, SESSION_COOKIE } from "@/server/auth/session";
import { secureCookies } from "@/server/env";
import { toFormState } from "@/server/errors";
import { dashboardPath } from "@/server/rbac/permissions";
import { rateLimit } from "@/server/rate-limit";
import { getClientIp } from "@/server/request";
import { safeNextPath } from "@/server/security";

const PENDING_COOKIE = "bm_otp";

type Pending = { mobile: string; next: string | null };

async function readPending(): Promise<Pending | null> {
  const raw = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "mobile" in parsed && typeof parsed.mobile === "string") {
      const next = "next" in parsed && typeof parsed.next === "string" ? parsed.next : null;
      return { mobile: parsed.mobile, next };
    }
  } catch {
    // A malformed cookie is treated as no pending login.
  }
  return null;
}

/** Step 1: ask for a code. The answer is the same whether or not the number has an account. */
export async function requestOtpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = mobileSchema.safeParse(String(formData.get("mobile") ?? ""));
  if (!parsed.success) {
    return { message: "اطلاعات واردشده را بررسی کنید.", errors: { mobile: parsed.error.issues[0]?.message ?? "" } };
  }
  const ip = await getClientIp();
  if (!rateLimit(`otp-request:${ip}`, 20, 10 * 60_000)) {
    return { message: "تعداد درخواست‌ها زیاد است. چند دقیقه‌ی دیگر دوباره تلاش کنید." };
  }
  try {
    const result = await requestOtp(parsed.data, ip === "unknown" ? null : ip);
    if (!result.ok) return { message: "تعداد درخواست‌ها زیاد است. چند دقیقه‌ی دیگر دوباره تلاش کنید." };
  } catch (error) {
    return toFormState(error);
  }
  const next = safeNextPath(String(formData.get("next") ?? ""), "");
  (await cookies()).set(PENDING_COOKIE, JSON.stringify({ mobile: parsed.data, next: next || null } satisfies Pending), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/login",
    maxAge: 10 * 60,
  });
  redirect("/login/verify");
}

/** Step 2: check the code, then start a session. */
export async function verifyOtpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const pending = await readPending();
  if (!pending) redirect("/login");

  const code = otpCodeSchema.safeParse(String(formData.get("code") ?? ""));
  if (!code.success) return { message: "اطلاعات واردشده را بررسی کنید.", errors: { code: "کد باید ۶ رقم باشد." } };

  let destination: string;
  try {
    const result = await verifyOtp(pending.mobile, code.data);
    if (!result.ok) {
      return result.reason === "locked"
        ? { message: "تعداد تلاش‌ها بیش از حد مجاز است. کد تازه‌ای درخواست کنید." }
        : { message: "کد نادرست است یا مهلت آن تمام شده است.", errors: { code: "کد را دوباره بررسی کنید." } };
    }
    await createSession(result.userId);
    const jar = await cookies();
    jar.delete({ name: PENDING_COOKIE, path: "/login" });
    const token = jar.get(SESSION_COOKIE)?.value;
    const user = token ? await findUserBySessionToken(token) : null;
    destination = safeNextPath(pending.next, dashboardPath(user));
  } catch (error) {
    return toFormState(error);
  }
  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

/** The number a code was just requested for (used by the verify page). */
export async function getPendingMobile(): Promise<string | null> {
  return (await readPending())?.mobile ?? null;
}
