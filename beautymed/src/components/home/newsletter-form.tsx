import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field } from "@/components/ui/field";
import { NEWSLETTER_CONSENT_TEXT } from "@/content/newsletter";
import { subscribeNewsletter } from "@/server/actions/newsletter";

export function NewsletterForm() {
  return (
    <ActionForm action={subscribeNewsletter} hideOnSuccess className="max-w-xl">
      <div className="space-y-3">
        <Field
          label="ایمیل یا شماره‌ی موبایل"
          name="contact"
          required
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          hint="نمونه: name@example.com یا ۰۹۱۲۱۲۳۴۵۶۷"
        />
        <Checkbox name="consent" label={NEWSLETTER_CONSENT_TEXT} required />
        <SubmitButton>عضویت در خبرنامه</SubmitButton>
      </div>
    </ActionForm>
  );
}
