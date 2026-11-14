import { prisma } from "@/server/db";
import type { NewsletterStore, NewsletterSubscription } from "./types";

/** Database-backed store, used whenever DATABASE_URL is configured. */
export class PrismaNewsletterStore implements NewsletterStore {
  async subscribe(subscription: NewsletterSubscription): Promise<void> {
    const { kind, value } = subscription.contact;
    await prisma.newsletterSubscriber.upsert({
      where: { kind_value: { kind, value } },
      create: { kind, value, consentText: subscription.consentText, consentAt: subscription.consentAt },
      update: {},
    });
  }

  count(): Promise<number> {
    return prisma.newsletterSubscriber.count();
  }
}
