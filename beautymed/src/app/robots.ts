import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { robotsConfig } from "@/lib/seo";

/** Read at request time, so turning SITE_INDEXABLE on at launch needs no rebuild. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  return robotsConfig();
}
