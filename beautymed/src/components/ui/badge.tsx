import { Lock } from "lucide-react";
import type { ReactNode } from "react";

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border border-line bg-bg px-2.5 py-0.5 text-sm text-ink ${className}`}
    >
      {children}
    </span>
  );
}

/** Every translation is labeled: machine-generated until an admin marks it physician-reviewed. */
export function TranslationBadge({ reviewed }: { reviewed: boolean }) {
  return <Badge>{reviewed ? "بازبینی‌شده" : "ترجمه‌ی ماشینی"}</Badge>;
}

export function LockedBadge({ label = "ویژه‌ی پزشکان تأییدشده" }: { label?: string }) {
  return (
    <Badge>
      <Lock aria-hidden="true" size={14} className="text-gold" />
      {label}
    </Badge>
  );
}
