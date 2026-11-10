import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary";
type Tone = "light" | "dark";

/** Buttons are ink or outlined. Gold is never used as a fill. Minimum touch target: 44px. */
export function buttonClass(variant: Variant = "primary", tone: Tone = "light", extra = ""): string {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-6 py-2 text-base font-medium transition-shadow hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-60";
  const styles: Record<Tone, Record<Variant, string>> = {
    light: {
      primary: "bg-ink text-bg border border-ink",
      secondary: "bg-bg text-ink border border-ink",
    },
    dark: {
      primary: "bg-bg text-ink border border-bg",
      secondary: "bg-transparent text-bg border border-bg",
    },
  };
  return `${base} ${styles[tone][variant]} ${extra}`.trim();
}

type CommonProps = { variant?: Variant; tone?: Tone; children: ReactNode; className?: string };

export function ButtonLink({
  variant,
  tone,
  className,
  children,
  ...props
}: CommonProps & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link className={buttonClass(variant, tone, className)} {...props}>
      {children}
    </Link>
  );
}

export function Button({
  variant,
  tone,
  className,
  children,
  type = "button",
  ...props
}: CommonProps & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button type={type} className={buttonClass(variant, tone, className)} {...props}>
      {children}
    </button>
  );
}
