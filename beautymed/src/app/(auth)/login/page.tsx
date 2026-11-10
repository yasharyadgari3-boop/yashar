import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/site-shell";
import { Container } from "@/components/ui/layout";
import { SampleNotice } from "@/components/ui/sample-notice";

export const metadata: Metadata = { title: "ورود" };

export default function LoginPage() {
  return (
    <SiteShell>
      <Container className="py-14 md:py-20">
        <span aria-hidden="true" className="gold-rule mb-6" />
        <h1 className="text-4xl md:text-5xl">ورود پزشکان</h1>
        <SampleNotice className="mt-8" text="ورود با کد پیامکی در فاز ۲ فعال می‌شود." />
      </Container>
    </SiteShell>
  );
}
