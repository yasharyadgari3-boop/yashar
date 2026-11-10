import { SiteShell } from "@/components/layout/site-shell";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";

export default function NotFound() {
  return (
    <SiteShell>
      <Container className="py-24">
        <span aria-hidden="true" className="gold-rule mb-6" />
        <h1 className="text-4xl md:text-5xl">صفحه پیدا نشد</h1>
        <p className="mt-5 text-lg text-muted">نشانی‌ای که وارد کرده‌اید وجود ندارد یا جابه‌جا شده است.</p>
        <div className="mt-8">
          <ButtonLink href="/">بازگشت به صفحه‌ی اصلی</ButtonLink>
        </div>
      </Container>
    </SiteShell>
  );
}
