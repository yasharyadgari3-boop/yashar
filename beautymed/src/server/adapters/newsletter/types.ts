import type { Contact } from "@/lib/validators";

export type NewsletterSubscription = {
  contact: Contact;
  /** The exact consent sentence the visitor agreed to. */
  consentText: string;
  consentAt: Date;
};

export interface NewsletterStore {
  /** Idempotent: subscribing the same contact twice keeps one record. */
  subscribe(subscription: NewsletterSubscription): Promise<void>;
  count(): Promise<number>;
}
