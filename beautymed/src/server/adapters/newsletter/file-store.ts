import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NewsletterStore, NewsletterSubscription } from "./types";

type Row = { kind: "email" | "mobile"; value: string; consentText: string; consentAt: string };

/**
 * Mock store: keeps subscribers in a local JSON file (default .data/newsletter.json, which is
 * git-ignored). For development only; the database store replaces it when DATABASE_URL is set.
 */
export class FileNewsletterStore implements NewsletterStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string = path.join(process.cwd(), ".data", "newsletter.json")) {}

  private async read(): Promise<Row[]> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filePath, "utf8"));
      return Array.isArray(parsed) ? (parsed as Row[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  subscribe(subscription: NewsletterSubscription): Promise<void> {
    // Serialize writes so two requests cannot overwrite each other.
    const run = this.queue.then(async () => {
      const rows = await this.read();
      const { kind, value } = subscription.contact;
      if (rows.some((r) => r.kind === kind && r.value === value)) return;
      rows.push({ kind, value, consentText: subscription.consentText, consentAt: subscription.consentAt.toISOString() });
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      await writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
      await rename(tmp, this.filePath);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async count(): Promise<number> {
    return (await this.read()).length;
  }
}
