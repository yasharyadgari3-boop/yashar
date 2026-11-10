"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { mainNav, site } from "@/content/site";

export type HeaderAccount = { href: string; label: string };

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Slim header. Over the homepage hero it is transparent with white text; after scrolling, and on
 * every other page, it is solid white. Desktop: full horizontal navigation. Tablet: condensed
 * (primary links). Mobile: hamburger opening a full-screen menu (native <dialog>, so focus is
 * trapped and Escape closes it).
 */
export function Header({ account }: { account: HeaderAccount }) {
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = overHero && !scrolled;
  const closeMenu = () => dialogRef.current?.close();

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b ${
          transparent ? "on-dark border-transparent bg-transparent text-bg" : "border-line bg-bg text-ink"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
          <Link href="/" className="latin flex min-h-11 items-center text-2xl tracking-wide" aria-label={`${site.name} — صفحه‌ی اصلی`}>
            {site.name}
          </Link>

          <nav aria-label="ناوبری اصلی" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {mainNav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href} className={item.primary ? "" : "hidden lg:block"}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center border-b px-3 text-base ${
                        active ? "border-gold" : "border-transparent"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <Link href={account.href} className="flex min-h-11 items-center px-3 text-base">
              {account.label}
            </Link>
            <button
              type="button"
              className="flex size-11 items-center justify-center lg:hidden"
              aria-label="باز کردن منو"
              aria-haspopup="dialog"
              onClick={() => dialogRef.current?.showModal()}
            >
              <Menu aria-hidden="true" size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Keeps page content below the fixed header everywhere except over the hero. */}
      {overHero ? null : <div aria-hidden="true" className="h-16" />}

      <dialog
        ref={dialogRef}
        aria-label="منوی سایت"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-bg p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <span className="latin text-2xl tracking-wide">{site.name}</span>
          <button type="button" className="flex size-11 items-center justify-center" aria-label="بستن منو" onClick={closeMenu}>
            <X aria-hidden="true" size={24} />
          </button>
        </div>
        <nav aria-label="منوی موبایل" className="px-5 py-4">
          <ul>
            {[...mainNav, { href: account.href, label: account.label }].map((item) => (
              <li key={item.href} className="border-b border-line">
                <Link
                  href={item.href}
                  onClick={closeMenu}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className="flex min-h-14 items-center text-lg"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </>
  );
}
