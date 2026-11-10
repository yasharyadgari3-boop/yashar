import Image from "next/image";
import { Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { site, type ImageBrief } from "@/content/site";
import { HeroMedia } from "./hero-media";

/**
 * Full-bleed, full-viewport hero (dynamic viewport units, so the mobile address bar does not cut
 * it off). One message, one primary call to action. Until the owner provides footage, the
 * background is plain charcoal with the written brief for the video and poster.
 */
export function Hero() {
  const poster: ImageBrief = site.heroPoster;
  return (
    <section aria-labelledby="hero-title" className="on-dark relative flex min-h-dvh items-center bg-ink text-bg">
      {poster.src ? (
        <Image src={poster.src} alt="" fill priority sizes="100vw" className="object-cover" />
      ) : null}
      {site.heroVideoSrc ? <HeroMedia src={site.heroVideoSrc} poster={poster.src} /> : null}
      {/* Subtle dark overlay keeps white Persian text readable over any footage. */}
      <div aria-hidden="true" className="absolute inset-0 bg-ink/45" />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-28 md:px-8">
        <div className="max-w-2xl">
          <span aria-hidden="true" className="gold-rule mb-8" />
          <h1 id="hero-title" className="text-5xl md:text-7xl">
            زیبایی، بر پایه‌ی دانش
          </h1>
          <p className="mt-6 text-lg leading-9 md:text-xl md:leading-10">
            محصولات اصیل، آموزش تخصصی و تازه‌ترین پژوهش‌های پزشکی زیبایی، در یک جا، برای پزشکان.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink href="/login" tone="dark" variant="primary">
              ورود پزشکان
            </ButtonLink>
            <ButtonLink href="/methods" tone="dark" variant="secondary">
              کشف روش‌ها
            </ButtonLink>
          </div>

          <form role="search" action="/search" method="get" className="mt-10 max-w-xl">
            <label htmlFor="hero-search" className="sr-only">
              جستجو در محصولات، روش‌ها و مقاله‌ها
            </label>
            <div className="flex items-center border-b border-bg">
              <input
                id="hero-search"
                name="q"
                type="search"
                placeholder="جستجو در محصولات، روش‌ها و مقاله‌ها"
                className="min-h-12 w-full bg-transparent px-1 text-sm text-bg sm:text-base placeholder:text-bg"
              />
              <button type="submit" aria-label="جستجو" className="flex size-12 shrink-0 items-center justify-center">
                <Search aria-hidden="true" size={20} />
              </button>
            </div>
          </form>
        </div>

        {poster.src ? null : (
          <p className="mt-16 max-w-2xl border-s border-gold ps-4 text-sm leading-7 text-bg">
            جایگاه ویدیو و پوستر — جایگزین شود. {poster.subject} نسبت ابعاد: ۱۶:۹. متن جایگزین: {poster.alt}.
          </p>
        )}
      </div>
    </section>
  );
}
