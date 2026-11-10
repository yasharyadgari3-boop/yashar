import { z } from "zod";
import { normalizeMobile, toLatinDigits } from "./persian-text";

export const mobileSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const mobile = normalizeMobile(v);
    if (!mobile) {
      ctx.addIssue({ code: "custom", message: "شماره‌ی موبایل معتبر نیست. نمونه: ۰۹۱۲۱۲۳۴۵۶۷" });
      return z.NEVER;
    }
    return mobile;
  });

const emailSchema = z.email();

export type Contact = { kind: "email"; value: string } | { kind: "mobile"; value: string };

/** An email address or an Iranian mobile number. */
export function parseContact(input: string): Contact | null {
  const trimmed = input.trim();
  if (trimmed.includes("@")) {
    const email = emailSchema.safeParse(trimmed.toLowerCase());
    return email.success ? { kind: "email", value: email.data } : null;
  }
  const mobile = normalizeMobile(trimmed);
  return mobile ? { kind: "mobile", value: mobile } : null;
}

export const newsletterSchema = z.object({
  contact: z
    .string()
    .max(200)
    .transform((v, ctx) => {
      const contact = parseContact(v);
      if (!contact) {
        ctx.addIssue({ code: "custom", message: "یک ایمیل یا شماره‌ی موبایل معتبر وارد کنید." });
        return z.NEVER;
      }
      return contact;
    }),
  consent: z.literal("on", { error: "برای عضویت، تأیید رضایت لازم است." }),
});

export const otpCodeSchema = z
  .string()
  .trim()
  .transform((v) => toLatinDigits(v))
  .pipe(z.string().regex(/^\d{6}$/, "کد باید ۶ رقم باشد."));

/** First error message per field, for showing next to form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
