import "server-only";
import { parsePmcXml, parsePubmedXml, type PmcInfo, type PubmedRecord } from "@/lib/pubmed";

/** Access to PubMed and PMC. Tests inject their own implementation. */
export interface PubmedClient {
  /** PMIDs for a query, newest first. */
  search(query: string, limit: number): Promise<{ count: number; pmids: string[] }>;
  fetchRecords(pmids: string[]): Promise<PubmedRecord[]>;
  /** License and full text for a PMC article. */
  fetchPmc(pmcid: string): Promise<PmcInfo>;
}

const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

/**
 * NCBI E-utilities client.
 * - Identifies the app with `tool`, and with `email` and `api_key` when they are configured
 *   (NCBI_TOOL, NCBI_EMAIL, NCBI_API_KEY in .env).
 * - Stays under NCBI's limit: the API reports 3 requests per second without a key
 *   (x-ratelimit-limit header, read 2026-11-15); a key raises it to 10. Requests are spaced
 *   out and a 429 response is retried after the server's Retry-After.
 * - Sends only our own queries and identifiers; nothing from NCBI is ever executed.
 */
export class EutilsClient implements PubmedClient {
  private last = 0;

  constructor(
    private readonly options: { tool?: string; email?: string; apiKey?: string; fetchImpl?: typeof fetch } = {},
  ) {}

  private get spacingMs(): number {
    return this.options.apiKey ? 120 : 400;
  }

  private async get(path: string, params: Record<string, string>): Promise<string> {
    const query = new URLSearchParams({ ...params, tool: this.options.tool || "beautymed" });
    if (this.options.email) query.set("email", this.options.email);
    if (this.options.apiKey) query.set("api_key", this.options.apiKey);
    const doFetch = this.options.fetchImpl ?? fetch;

    for (let attempt = 0; attempt < 3; attempt++) {
      const wait = this.last + this.spacingMs - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      this.last = Date.now();
      const response = await doFetch(`${BASE}/${path}?${query}`, { signal: AbortSignal.timeout(30_000) });
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await new Promise((resolve) => setTimeout(resolve, Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * (attempt + 1), 15_000)));
        continue;
      }
      if (!response.ok) throw new Error(`NCBI ${path} answered ${response.status}`);
      return response.text();
    }
    throw new Error(`NCBI ${path} is unavailable or rate-limited; try again later.`);
  }

  async search(query: string, limit: number): Promise<{ count: number; pmids: string[] }> {
    const body = await this.get("esearch.fcgi", { db: "pubmed", term: query, retmode: "json", retmax: String(limit), sort: "pub_date" });
    const result = (JSON.parse(body) as { esearchresult?: { count?: string; idlist?: unknown; ERROR?: string } }).esearchresult;
    if (!result || result.ERROR) throw new Error(`PubMed rejected the query: ${result?.ERROR ?? "no result"}`);
    const pmids = Array.isArray(result.idlist) ? result.idlist.filter((id): id is string => typeof id === "string" && /^\d+$/.test(id)) : [];
    return { count: Number(result.count ?? pmids.length), pmids };
  }

  async fetchRecords(pmids: string[]): Promise<PubmedRecord[]> {
    if (pmids.length === 0) return [];
    return parsePubmedXml(await this.get("efetch.fcgi", { db: "pubmed", id: pmids.join(","), retmode: "xml" }));
  }

  async fetchPmc(pmcid: string): Promise<PmcInfo> {
    if (!/^PMC\d+$/.test(pmcid)) throw new Error("Invalid PMC id");
    return parsePmcXml(await this.get("efetch.fcgi", { db: "pmc", id: pmcid, retmode: "xml" }));
  }
}

let client: PubmedClient | undefined;

export function getPubmedClient(): PubmedClient {
  client ??= new EutilsClient({
    tool: process.env.NCBI_TOOL || undefined,
    email: process.env.NCBI_EMAIL || undefined,
    apiKey: process.env.NCBI_API_KEY || undefined,
  });
  return client;
}
