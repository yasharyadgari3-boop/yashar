import { Hero } from "@/components/home/hero";
import { homeJsonLd, serializeJsonLd } from "@/lib/seo";
import {
  FaqSection,
  ImportersSection,
  MethodsSection,
  NewsletterSection,
  PrpPrfSection,
  ProductsSection,
  ResearchSection,
  TrainingSection,
  TrustSection,
} from "@/components/home/sections";

/** Homepage: the eleven sections from the brief, in order (the footer is section 11). */
export const metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeJsonLd()) }} />
      <Hero />
      <MethodsSection />
      <ProductsSection />
      <PrpPrfSection />
      <TrainingSection />
      <ResearchSection />
      <TrustSection />
      <ImportersSection />
      <NewsletterSection />
      <FaqSection />
    </>
  );
}
