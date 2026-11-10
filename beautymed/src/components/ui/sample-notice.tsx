import { SAMPLE } from "@/content/sample";

/** Visible marker for placeholder content, so nobody mistakes it for real medical or product data. */
export function SampleNotice({ text = SAMPLE, className = "" }: { text?: string; className?: string }) {
  return (
    <p className={`inline-block border border-line bg-alt px-3 py-1 text-sm text-muted ${className}`}>{text}</p>
  );
}
