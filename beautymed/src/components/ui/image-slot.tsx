import Image from "next/image";
import type { ImageBrief } from "@/content/site";
import { toPersianDigits } from "@/lib/format";

const ratioClass: Record<ImageBrief["ratio"], string> = {
  "4:5": "aspect-[4/5]",
  "3:2": "aspect-[3/2]",
  "16:9": "aspect-video",
  "1:1": "aspect-square",
};

/**
 * A slot for an image the owner will shoot or license. Until `src` is set it shows the written
 * brief (subject, aspect ratio, Persian alt text) instead of a stock photo.
 */
export function ImageSlot({
  brief,
  className = "",
  reveal = true,
  sizes = "(min-width: 64rem) 33vw, 100vw",
}: {
  brief: ImageBrief;
  className?: string;
  reveal?: boolean;
  sizes?: string;
}) {
  const revealAttrs = reveal ? { "data-reveal": "", className: "img-reveal h-full w-full" } : { className: "h-full w-full" };

  if (brief.src) {
    return (
      <div className={`relative overflow-hidden bg-alt ${ratioClass[brief.ratio]} ${className}`}>
        <div {...revealAttrs}>
          <Image src={brief.src} alt={brief.alt} fill sizes={sizes} className="object-cover" />
        </div>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`جایگاه تصویر: ${brief.alt}`}
      className={`overflow-hidden border border-line bg-alt ${ratioClass[brief.ratio]} ${className}`}
    >
      <div {...revealAttrs}>
        <div className="flex h-full flex-col justify-end gap-1 p-4 text-sm leading-6 text-muted">
          <span className="text-ink">جایگاه تصویر — جایگزین شود</span>
          <span>موضوع: {brief.subject}</span>
          <span>نسبت ابعاد: {toPersianDigits(brief.ratio)}</span>
          <span>متن جایگزین: {brief.alt}</span>
        </div>
      </div>
    </div>
  );
}
