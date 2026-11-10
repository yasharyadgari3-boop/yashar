import Link from "next/link";
import { mainNav, site } from "@/content/site";
import { SAMPLE } from "@/content/sample";

const infoLinks = [
  { href: "/about", label: "درباره‌ی ما" },
  { href: "/contact", label: "تماس با ما" },
  { href: "/rules", label: "قوانین و مقررات" },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-11 items-center text-base text-ink hover:underline">
        {label}
      </Link>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-alt">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 md:grid-cols-4 md:px-8">
        <div>
          <p className="latin text-2xl tracking-wide">{site.name}</p>
          <span aria-hidden="true" className="gold-rule my-4" />
          <p className="text-base text-muted">مرجع پزشکان زیبایی</p>
        </div>

        <nav aria-label="بخش‌های سایت">
          <h2 className="mb-2 text-base font-medium">بخش‌ها</h2>
          <ul>
            {mainNav.map((item) => (
              <FooterLink key={item.href} {...item} />
            ))}
          </ul>
        </nav>

        <nav aria-label="اطلاعات">
          <h2 className="mb-2 text-base font-medium">اطلاعات</h2>
          <ul>
            {infoLinks.map((item) => (
              <FooterLink key={item.href} {...item} />
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-2 text-base font-medium">تماس</h2>
          <ul className="space-y-2 text-base text-muted">
            <li>نشانی: {SAMPLE}</li>
            <li>تلفن: {SAMPLE}</li>
            <li>ایمیل: {SAMPLE}</li>
            <li>شبکه‌های اجتماعی: {SAMPLE}</li>
          </ul>
          {/* [ENAMAD_BADGE]: replace this box with the official e-Namad embed once issued. */}
          <div className="mt-6 flex size-28 items-center justify-center border border-line bg-bg p-2 text-center text-sm leading-6 text-muted">
            جایگاه نماد اعتماد الکترونیکی
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-6xl px-5 py-6 text-sm text-muted md:px-8">
          تمامی حقوق این وب‌سایت محفوظ است.
        </p>
      </div>
    </footer>
  );
}
