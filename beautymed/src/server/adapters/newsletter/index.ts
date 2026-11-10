import "server-only";
import { FileNewsletterStore } from "./file-store";
import type { NewsletterStore } from "./types";

let store: NewsletterStore | undefined;

export function getNewsletterStore(): NewsletterStore {
  store ??= new FileNewsletterStore(process.env.NEWSLETTER_FILE || undefined);
  return store;
}

export type { NewsletterStore, NewsletterSubscription } from "./types";
