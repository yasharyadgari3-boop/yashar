import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/layout";

export type SubNavItem = { href: string; label: string };

/** Every medical page shows this until a physician marks it as reviewed. */
export function ReviewNotice({ reviewedBy }: { reviewedBy: string | null }) {
  return (
    <p className="mt-6 inline-block border border-line bg-alt px-4 py-2 text-base text-ink">
      {reviewedBy
        ? `بازبینی‌شده توسط: ${reviewedBy}`
        : "این صفحه هنوز توسط پزشک بازبینی نشده است و جنبه‌ی آموزشی دارد."}
    </p>
  );
}

/**
 * Shared frame for content hubs: title, the hub's own sub-navigation, optional review notice.
 * The sub-navigation wraps instead of scrolling sideways, so it works at 360px.
 */
export function HubLayout({
  title,
  lead,
  subnav,
  subnavLabel,
  currentHref,
  reviewedBy,
  children,
}: {
  title: ReactNode;
  lead?: ReactNode;
  subnav: ReadonlyArray<SubNavItem>;
  subnavLabel: string;
  currentHref: string;
  /** Pass `undefined` for pages that are not medical content (no notice shown). */
  reviewedBy?: string | null;
  children: ReactNode;
}) {
  return (
    <>
      <div className="border-b border-line bg-alt">
        <Container className="py-14 md:py-20">
          <span aria-hidden="true" className="gold-rule mb-6" />
          <h1 className="text-4xl md:text-5xl">{title}</h1>
          {lead ? <p className="mt-5 max-w-2xl text-lg text-muted">{lead}</p> : null}
          {reviewedBy === undefined ? null : <ReviewNotice reviewedBy={reviewedBy} />}
        </Container>
      </div>
      <nav aria-label={subnavLabel} className="border-b border-line bg-bg">
        <Container>
          <ul className="flex flex-wrap gap-x-2">
            {subnav.map((item) => {
              const active = item.href === currentHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center border-b-2 px-3 text-base ${
                      active ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </nav>
      <Container className="py-14 md:py-20">{children}</Container>
    </>
  );
}
