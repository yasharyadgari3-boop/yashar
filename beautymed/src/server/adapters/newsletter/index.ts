import "server-only";
import { FileNewsletterStore } from "./file-store";
import { PrismaNewsletterStore } from "./prisma-store";
import type { NewsletterStore } from "./types";

let store: NewsletterStore | undefined;

/**
 * Subscribers go to the database when one is configured. NEWSLETTER_STORE=file (or no
 * DATABASE_URL) keeps the file-backed mock from Phase 1.
 */
export function getNewsletterStore(): NewsletterStore {
  if (store) return store;
  const useFile = process.env.NEWSLETTER_STORE === "file" || !process.env.DATABASE_URL;
  store = useFile ? new FileNewsletterStore(process.env.NEWSLETTER_FILE || undefined) : new PrismaNewsletterStore();
  return store;
}

export type { NewsletterStore, NewsletterSubscription } from "./types";
