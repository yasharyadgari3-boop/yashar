import { Plus } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Accordion built on native <details>/<summary>: keyboard and screen-reader support come from
 * the browser, and it works without JavaScript.
 */
export function Accordion({ items }: { items: ReadonlyArray<{ question: string; answer: ReactNode }> }) {
  return (
    <div className="border-t border-line">
      {items.map((item) => (
        <details key={item.question} className="group border-b border-line">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg text-ink [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <Plus aria-hidden="true" size={20} className="shrink-0 text-gold group-open:rotate-45" />
          </summary>
          <div className="pb-6 text-muted">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
