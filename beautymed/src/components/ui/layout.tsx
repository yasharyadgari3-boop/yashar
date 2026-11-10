import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 md:px-8 ${className}`}>{children}</div>;
}

export function Section({
  children,
  alt = false,
  id,
  labelledBy,
  className = "",
}: {
  children: ReactNode;
  /** Use the alternate (very light neutral) background. */
  alt?: boolean;
  id?: string;
  labelledBy?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`${alt ? "bg-alt" : "bg-bg"} py-20 md:py-28 ${className}`}
    >
      <Container>{children}</Container>
    </section>
  );
}

/** Section heading with a thin gold rule. Heading text is ink; the rule carries the gold. */
export function SectionHeading({
  id,
  title,
  lead,
  as: Tag = "h2",
  center = false,
}: {
  id?: string;
  title: ReactNode;
  lead?: ReactNode;
  as?: "h1" | "h2";
  center?: boolean;
}) {
  return (
    <div className={`mb-12 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <span aria-hidden="true" className={`gold-rule mb-6 ${center ? "mx-auto" : ""}`} />
      <Tag id={id} className={Tag === "h1" ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"}>
        {title}
      </Tag>
      {lead ? <p className="mt-5 text-lg text-muted">{lead}</p> : null}
    </div>
  );
}
