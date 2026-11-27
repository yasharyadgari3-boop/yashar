import { Search } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { site } from "@/content/site";
import { clinicImage } from "@/content/presentation-media";
import { HeroMedia } from "./hero-media";

export function Hero() {
 return (
  <section aria-labelledby="hero-title" className="beautymed-hero">
   <img src={clinicImage} alt="فضای روشن کلینیک پزشکی زیبایی" className="beautymed-hero-photo" fetchPriority="high" />
   {site.heroVideoSrc ? <HeroMedia src={site.heroVideoSrc} poster={clinicImage} /> : null}
   <div className="beautymed-hero-inner"><div className="beautymed-hero-copy">
    <p className="beautymed-eyebrow">مرجع تخصصی پزشکی زیبایی</p>
    <h1 id="hero-title" className="beautymed-brand">beauty<span>Med</span></h1>
    <h2>زیبایی، بر پایهٔ دانش</h2>
    <p className="mt-5 text-base leading-8 text-muted">محصولات اصیل، آموزش تخصصی و تازه‌ترین پژوهش‌های پزشکی زیبایی، در یک جا، برای پزشکان.</p>
    <div className="mt-7 flex flex-wrap gap-3"><ButtonLink href="/login">ورود پزشکان</ButtonLink><ButtonLink href="/methods" variant="secondary">کشف روش‌ها</ButtonLink></div>
    <form role="search" action="/search" method="get" className="beautymed-hero-search">
     <label htmlFor="hero-search" className="sr-only">جستجو در محصولات، روش‌ها و مقاله‌ها</label>
     <input id="hero-search" name="q" type="search" placeholder="جستجو در محصولات، روش‌ها و مقاله‌ها" />
     <Button type="submit" variant="secondary" className="border-transparent bg-transparent px-0" aria-label="جستجو"><Search aria-hidden="true" size={20}/></Button>
    </form>
   </div></div>
  </section>
 );
}
