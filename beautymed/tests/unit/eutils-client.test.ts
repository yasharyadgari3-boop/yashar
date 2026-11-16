// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EutilsClient } from "@/server/adapters/pubmed";

const fixture = (name: string) => readFileSync(path.join(__dirname, "../fixtures/pubmed", name), "utf8");

function fakeFetch(responses: Array<{ status?: number; body?: string; headers?: Record<string, string> }>) {
  const urls: URL[] = [];
  const impl = vi.fn(async (input: string | URL | Request) => {
    urls.push(new URL(String(input)));
    const next = responses.shift() ?? { status: 500 };
    return new Response(next.body ?? "", { status: next.status ?? 200, headers: next.headers });
  });
  return { impl: impl as unknown as typeof fetch, urls };
}

afterEach(() => vi.useRealTimers());

describe("EutilsClient", () => {
  it("identifies the app and returns only numeric PMIDs", async () => {
    const { impl, urls } = fakeFetch([{ body: JSON.stringify({ esearchresult: { count: "42", idlist: ["123", "x; drop", 7, "456"] } }) }]);
    const client = new EutilsClient({ tool: "beautymed", email: "owner@example.org", apiKey: "k", fetchImpl: impl });
    expect(await client.search('"Hyaluronic Acid"[MeSH]', 5)).toEqual({ count: 42, pmids: ["123", "456"] });
    const url = urls[0]!;
    expect(url.host).toBe("eutils.ncbi.nlm.nih.gov");
    expect(url.searchParams.get("tool")).toBe("beautymed");
    expect(url.searchParams.get("email")).toBe("owner@example.org");
    expect(url.searchParams.get("api_key")).toBe("k");
    expect(url.searchParams.get("retmax")).toBe("5");
  });

  it("sends no email or key when none is configured", async () => {
    const { impl, urls } = fakeFetch([{ body: JSON.stringify({ esearchresult: { idlist: [] } }) }]);
    await new EutilsClient({ fetchImpl: impl }).search("prp", 1);
    expect(urls[0]!.searchParams.has("email")).toBe(false);
    expect(urls[0]!.searchParams.has("api_key")).toBe(false);
  });

  it("reports a query PubMed rejects", async () => {
    const { impl } = fakeFetch([{ body: JSON.stringify({ esearchresult: { ERROR: "bad term" } }) }]);
    await expect(new EutilsClient({ fetchImpl: impl }).search("((", 1)).rejects.toThrow("bad term");
  });

  it("retries after 429 using Retry-After, then succeeds", async () => {
    vi.useFakeTimers();
    const { impl } = fakeFetch([
      { status: 429, headers: { "retry-after": "1" } },
      { body: JSON.stringify({ esearchresult: { idlist: ["1"] } }) },
    ]);
    const pending = new EutilsClient({ fetchImpl: impl }).search("prp", 1);
    await vi.runAllTimersAsync();
    expect((await pending).pmids).toEqual(["1"]);
  });

  it("gives up after three failed attempts and fails on other errors", async () => {
    vi.useFakeTimers();
    const { impl } = fakeFetch([{ status: 503 }, { status: 503 }, { status: 503 }]);
    const pending = new EutilsClient({ fetchImpl: impl }).search("prp", 1);
    const assertion = expect(pending).rejects.toThrow("unavailable or rate-limited");
    await vi.runAllTimersAsync();
    await assertion;

    vi.useRealTimers();
    const notFound = fakeFetch([{ status: 404 }]);
    await expect(new EutilsClient({ fetchImpl: notFound.impl }).fetchRecords(["1"])).rejects.toThrow("answered 404");
  });

  it("fetches and parses records, skips empty lists, and validates PMC ids", async () => {
    const { impl, urls } = fakeFetch([{ body: fixture("efetch.xml") }]);
    const client = new EutilsClient({ fetchImpl: impl });
    expect(await client.fetchRecords([])).toEqual([]);
    const records = await client.fetchRecords(["1", "2"]);
    expect(records.length).toBeGreaterThan(0);
    expect(urls).toHaveLength(1);
    expect(urls[0]!.searchParams.get("id")).toBe("1,2");
    await expect(client.fetchPmc("PMC1&db=x")).rejects.toThrow("Invalid PMC id");
  });

  it("reads the license of a PMC article", async () => {
    const { impl, urls } = fakeFetch([{ body: fixture("pmc-PMC8438644.xml") }]);
    const info = await new EutilsClient({ fetchImpl: impl }).fetchPmc("PMC8438644");
    expect(urls[0]!.searchParams.get("db")).toBe("pmc");
    expect(info).toHaveProperty("licenseUrl");
  });
});
