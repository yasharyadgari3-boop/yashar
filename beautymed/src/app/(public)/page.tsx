import { Hero } from "@/components/home/hero";
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
export default function HomePage() {
  return (
    <>
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
