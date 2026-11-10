import type { MetadataRoute } from "next";

/** Until launch (Phase 6) the site must not be indexed: it contains only sample content. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
