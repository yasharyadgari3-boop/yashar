import Link from "next/link";
import { BadgeCheck, FileCheck2, Languages } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { LockedBadge, TranslationBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ImageSlot } from "@/components/ui/image-slot";
import { Section, SectionHeading } from "@/components/ui/layout";
import { SampleNotice } from "@/components/ui/sample-notice";
import { faqItems } from "@/content/faq";
import { SAMPLE } from "@/content/sample";
import { hubs, productCategories, type ImageBrief } from "@/content/site";
import { NewsletterForm } from "./newsletter-form";

/* 2. Methods */
export function MethodsSection() {
  const order = ["fillers", "mesotherapy", "prp", "prf", "methods"] as const;
  const cards = order.map((slug) => hubs.find((h) => h.slug === slug)).filter((h) => h !== undefined);
  return (
    <Section labelledBy="methods-title">
      <div className="reveal">
        <SectionHeading id="methods-title" title="روش‌های زیبایی، به زبان علم" />
      </div>
      <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((hub) => (
          <li key={hub.slug} className="reveal">
            <Link href={`/${hub.slug}`} className="card-zoom group block">
              <div className="card-zoom-media overflow-hidden">
                <ImageSlot brief={hub.image} sizes="(min-width: 64rem) 20vw, (min-width: 40rem) 50vw, 100vw" />
              </div>
              <span className="mt-4 block text-xl group-hover:underline">{hub.cardLabel}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* 3. Products */
export function ProductsSection() {
  return (
    <Section alt labelledBy="products-title">
      <div className="reveal">
        <SectionHeading
          id="products-title"
          title="محصولات اصیل، فقط برای کادر درمان"
          lead="ثبت سفارش فقط با حساب پزشک تأییدشده ممکن است. اطلاعات محصولات برای همه قابل مشاهده است."
        />
      </div>
      <ul className="grid gap-8 md:grid-cols-2">
        {productCategories.map((category) => (
          <li key={category.slug} className="reveal">
            <Link href={`/shop?category=${category.slug}`} className="card-zoom group block">
              <div className="card-zoom-media overflow-hidden">
                <ImageSlot brief={category.image} sizes="(min-width: 48rem) 50vw, 100vw" />
              </div>
              <span className="mt-4 block text-xl group-hover:underline">{category.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="reveal mt-12">
        <ButtonLink href="/shop" variant="secondary">
          مشاهده‌ی فروشگاه
        </ButtonLink>
      </div>
    </Section>
  );
}

/* 4. PRP and PRF */
const prpPrfImage: ImageBrief = {
  subject: "نمای بزرگ و آرام از لوله‌های آزمایش در نور طبیعی آزمایشگاه؛ بدون خون‌گیری یا تزریق.",
  ratio: "4:5",
  alt: "لوله‌های آزمایش در نور طبیعی",
};

export function PrpPrfSection() {
  return (
    <Section labelledBy="prp-prf-title">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <ImageSlot brief={prpPrfImage} sizes="(min-width: 48rem) 50vw, 100vw" />
        <div className="reveal">
          <SectionHeading id="prp-prf-title" title="PRP و PRF؛ از پایه تا پیشرفته" />
          <SampleNotice />
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/prp">ورود به بخش PRP</ButtonLink>
            <ButtonLink href="/prf" variant="secondary">
              ورود به بخش PRF
            </ButtonLink>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* 5. Physician training */
const sampleCourses = ["دوره‌ی نمونه ۱", "دوره‌ی نمونه ۲", "دوره‌ی نمونه ۳"];

export function TrainingSection() {
  return (
    <Section alt labelledBy="training-title">
      <div className="reveal">
        <SectionHeading
          id="training-title"
          title="آموزش تخصصی برای پزشکان"
          lead="دوره‌ها فقط برای پزشکان تأییدشده باز می‌شوند."
        />
      </div>
      <ul className="grid gap-6 md:grid-cols-3">
        {sampleCourses.map((course) => (
          <li key={course} className="reveal border border-line bg-bg p-6">
            <LockedBadge />
            <h3 className="mt-5 text-xl">{course}</h3>
            <p className="mt-2 text-muted">{SAMPLE}</p>
          </li>
        ))}
      </ul>
      <div className="reveal mt-12">
        <ButtonLink href="/training" variant="secondary">
          مشاهده‌ی دوره‌ها
        </ButtonLink>
      </div>
    </Section>
  );
}

/* 6. Research library (placeholders until the PubMed module arrives in Phase 5) */
const sampleArticles = [
  { id: 1, reviewed: false },
  { id: 2, reviewed: false },
  { id: 3, reviewed: true },
];

export function ResearchSection() {
  return (
    <Section labelledBy="research-title">
      <div className="reveal">
        <SectionHeading id="research-title" title="تازه‌ترین پژوهش‌ها، به فارسی" />
      </div>
      <ul className="grid gap-6 md:grid-cols-3">
        {sampleArticles.map((article) => (
          <li key={article.id} className="reveal border-t border-gold pt-6">
            <TranslationBadge reviewed={article.reviewed} />
            <h3 className="mt-4 text-xl">عنوان مقاله‌ی نمونه — جایگزین شود</h3>
            <dl className="mt-3 space-y-1 text-base text-muted">
              <div className="flex gap-2">
                <dt>مجله:</dt>
                <dd>نمونه — جایگزین شود</dd>
              </div>
              <div className="flex gap-2">
                <dt>تاریخ:</dt>
                <dd>نمونه — جایگزین شود</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <div className="reveal mt-12">
        <ButtonLink href="/library" variant="secondary">
          ورود به کتابخانه‌ی پژوهش
        </ButtonLink>
      </div>
    </Section>
  );
}

/* 7. Trust: only real platform features, never invented numbers */
const trustItems = [
  {
    icon: FileCheck2,
    title: "کد ثبت روی هر محصول",
    text: "هیچ محصولی بدون کد ثبت سازمان غذا و دارو، نام واردکننده و مشخصات اصالت منتشر نمی‌شود.",
  },
  {
    icon: BadgeCheck,
    title: "تأیید دستی پزشکان",
    text: "هر حساب پزشک با شماره‌ی نظام پزشکی و مدرک، توسط مدیر سایت بررسی و تأیید می‌شود.",
  },
  {
    icon: Languages,
    title: "ترجمه‌های برچسب‌دار و قابل بازبینی",
    text: "هر ترجمه برچسب «ترجمه‌ی ماشینی» دارد تا زمانی که یک پزشک آن را بازبینی کند.",
  },
];

export function TrustSection() {
  return (
    <Section alt labelledBy="trust-title">
      <div className="reveal">
        <SectionHeading id="trust-title" title="چرا پزشکان به ما اعتماد می‌کنند" />
      </div>
      <ul className="grid gap-10 md:grid-cols-3">
        {trustItems.map(({ icon: Icon, title, text }) => (
          <li key={title} className="reveal">
            <Icon aria-hidden="true" size={28} strokeWidth={1.25} className="text-gold" />
            <h3 className="mt-4 text-xl">{title}</h3>
            <p className="mt-2 text-muted">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* 8. For importers. No logo row until an admin marks a company as having given written permission. */
export function ImportersSection() {
  return (
    <Section labelledBy="importers-title">
      <div className="reveal">
        <SectionHeading
          id="importers-title"
          title="برای شرکت‌های واردکننده"
          lead="محصولات ثبت‌شده‌ی خود را پس از بررسی مدارک، به پزشکان تأییدشده معرفی کنید."
        />
        <ButtonLink href="/login?next=/dashboard">ورود به پنل واردکنندگان</ButtonLink>
      </div>
    </Section>
  );
}

/* 9. Newsletter */
export function NewsletterSection() {
  return (
    <Section alt labelledBy="newsletter-title">
      <div className="reveal">
        <SectionHeading id="newsletter-title" title="پژوهش‌های تازه، هر هفته" />
      </div>
      <NewsletterForm />
    </Section>
  );
}

/* 10. FAQ */
export function FaqSection() {
  return (
    <Section labelledBy="faq-title">
      <div className="reveal">
        <SectionHeading id="faq-title" title="پرسش‌های پرتکرار" />
      </div>
      <div className="max-w-3xl">
        <Accordion items={faqItems} />
      </div>
    </Section>
  );
}
