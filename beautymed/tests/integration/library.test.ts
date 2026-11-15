// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { parsePmcXml, parsePubmedXml, type PmcInfo } from "@/lib/pubmed";
import type { PubmedClient } from "@/server/adapters/pubmed";
import { MockTranslationProvider, type TranslationProvider } from "@/server/adapters/translation";
import { prisma } from "@/server/db";
import {
  createFullTextTranslation,
  ensureDefaultTopics,
  ensureSummary,
  fetchAllTopics,
  fetchTopic,
  getArticle,
  listArticles,
  listRecentRuns,
  listTopics,
  saveTopic,
  searchArticles,
  setTranslationReviewed,
} from "@/server/services/library";
import { setSetting } from "@/server/services/settings";
import { resetDatabase } from "./helpers";

const fixture = (name: string) => readFileSync(path.resolve(__dirname, "../fixtures/pubmed", name), "utf8");
const records = parsePubmedXml(fixture("efetch.xml"));
const ccBy = parsePmcXml(fixture("pmc-PMC13631032.xml"));

/** A PubMed client that answers from saved real responses and counts its calls. */
function fakeClient(overrides: Partial<PubmedClient> = {}) {
  const calls = { search: 0, fetchRecords: [] as string[][], fetchPmc: [] as string[] };
  const client: PubmedClient = {
    async search() {
      calls.search += 1;
      return { count: records.length, pmids: records.map((r) => r.pmid) };
    },
    async fetchRecords(pmids) {
      calls.fetchRecords.push(pmids);
      return records.filter((r) => pmids.includes(r.pmid));
    },
    async fetchPmc(pmcid): Promise<PmcInfo> {
      calls.fetchPmc.push(pmcid);
      return ccBy;
    },
    ...overrides,
  };
  return { client, calls };
}

function countingProvider() {
  const mock = new MockTranslationProvider();
  const calls = { summarize: 0, fullText: [] as string[] };
  const provider: TranslationProvider = {
    name: "counting-mock",
    async summarize(input) {
      calls.summarize += 1;
      return mock.summarize(input);
    },
    async translateFullText(input) {
      calls.fullText.push(input.text);
      return mock.translateFullText();
    },
  };
  return { provider, calls };
}

let adminId: string;
let topicId: string;

beforeEach(async () => {
  await resetDatabase();
  adminId = (await prisma.user.create({ data: { mobile: "09120000001", role: "ADMIN" } })).id;
  await ensureDefaultTopics();
  topicId = (await prisma.pubmedTopic.findUniqueOrThrow({ where: { slug: "dermal-fillers" } })).id;
});

describe("saved searches", () => {
  it("start with the seven defaults and are editable by the admin", async () => {
    expect(await listTopics()).toHaveLength(7);
    await ensureDefaultTopics();
    expect(await listTopics()).toHaveLength(7);

    await saveTopic(adminId, { id: topicId, slug: "dermal-fillers", title: "فیلرها", query: '"Dermal Fillers"[majr]', enabled: false });
    await ensureDefaultTopics(); // does not undo the admin's edit
    const edited = await prisma.pubmedTopic.findUniqueOrThrow({ where: { id: topicId } });
    expect(edited).toMatchObject({ title: "فیلرها", query: '"Dermal Fillers"[majr]', enabled: false });
    expect(await listTopics(true)).toHaveLength(6);

    await saveTopic(adminId, { slug: "new-topic", title: "موضوع تازه", query: "skin boosters[tiab]", enabled: true });
    await expect(saveTopic(adminId, { slug: "new-topic", title: "تکراری", query: "x y z", enabled: true })).rejects.toMatchObject({ code: "conflict" });
    await expect(saveTopic(adminId, { slug: "bad slug", title: "x", query: "", enabled: true })).rejects.toMatchObject({ code: "validation_error" });
  });
});

describe("fetching from a saved search", () => {
  it("stores new articles once, with their license decision", async () => {
    const { client, calls } = fakeClient();
    expect(await fetchTopic(topicId, client)).toEqual({ found: 3, added: 3 });
    expect(calls.fetchPmc).toEqual(["PMC13631032"]); // only the article that is in PMC

    const openAccess = await getArticle("42420660");
    expect(openAccess).toMatchObject({ pmcid: "PMC13631032", license: "cc-by", fullTextTranslatable: true });
    const closed = await getArticle("43025928");
    expect(closed).toMatchObject({ pmcid: null, license: null, fullTextTranslatable: false });

    // A second run finds nothing new and does not download the records again.
    expect(await fetchTopic(topicId, client)).toEqual({ found: 3, added: 0 });
    expect(calls.fetchRecords[1]).toEqual([]);
    expect(await prisma.article.count()).toBe(3);
    expect((await listArticles({ topicSlug: "dermal-fillers" })).map((a) => a.pmid)).toEqual(["43025928", "42674147", "42420660"]);

    const runs = await listRecentRuns();
    expect(runs.map((r) => [r.found, r.added, r.error])).toEqual([
      [3, 0, null],
      [3, 3, null],
    ]);
    expect((await prisma.pubmedTopic.findUniqueOrThrow({ where: { id: topicId } })).lastFetchedAt).not.toBeNull();
  });

  it("separates translatable full texts from summary-only articles by license", async () => {
    const nc = parsePmcXml(fixture("pmc-PMC8438644.xml"));
    await fetchTopic(topicId, fakeClient({ fetchPmc: async () => nc }).client);
    expect(await getArticle("42420660")).toMatchObject({ license: "cc-by-nc", fullTextTranslatable: false });
  });

  it("an article shared by two topics is stored once and listed under both", async () => {
    const { client } = fakeClient();
    const other = (await prisma.pubmedTopic.findUniqueOrThrow({ where: { slug: "filler-complications" } })).id;
    await fetchTopic(topicId, client);
    expect(await fetchTopic(other, client)).toEqual({ found: 3, added: 0 });
    expect(await prisma.article.count()).toBe(3);
    expect(await listArticles({ topicSlug: "filler-complications" })).toHaveLength(3);
  });

  it("records a failed run and keeps going with the other topics", async () => {
    let n = 0;
    const { client } = fakeClient({
      search: async () => {
        n += 1;
        if (n === 1) throw new Error("NCBI esearch.fcgi answered 503");
        return { count: 3, pmids: records.map((r) => r.pmid) };
      },
    });
    const results = await fetchAllTopics(client);
    expect(results).toHaveLength(7);
    expect(results[0]).toMatchObject({ slug: "dermal-fillers", error: "NCBI esearch.fcgi answered 503" });
    expect(results[1]).toMatchObject({ found: 3, added: 3 });
    expect(await prisma.fetchRun.count({ where: { error: { not: null } } })).toBe(1);
  });

  it("a license lookup failure makes the article summary-only instead of failing the run", async () => {
    const { client } = fakeClient({
      fetchPmc: async () => {
        throw new Error("NCBI efetch.fcgi answered 500");
      },
    });
    expect(await fetchTopic(topicId, client)).toEqual({ found: 3, added: 3 });
    expect(await getArticle("42420660")).toMatchObject({ license: null, fullTextTranslatable: false });
  });
});

describe("translation on demand", () => {
  it("summarizes the first time an article is opened, then reuses the result", async () => {
    await fetchTopic(topicId, fakeClient().client);
    const article = (await getArticle("43025928"))!;
    const { provider, calls } = countingProvider();
    expect(article.translations).toEqual([]);

    const [a, b] = await Promise.all([ensureSummary(article.id, provider), ensureSummary(article.id, provider)]);
    const c = await ensureSummary(article.id, provider);
    expect(a.id).toBe(b.id);
    expect(c.id).toBe(a.id);
    expect(await prisma.articleTranslation.count()).toBe(1);
    expect(calls.summarize).toBeLessThanOrEqual(2); // two simultaneous first readers at most
    expect(c).toMatchObject({ provider: "counting-mock", physicianReviewed: false });
    expect((await listArticles())[0]?.translations[0]?.titleFa).toContain("ترجمه‌ی آزمایشی");
    expect(await searchArticles("cosmetic")).toMatchObject([{ pmid: "43025928" }]);
  });

  it("translates the full text only when the license allows it, and only once", async () => {
    const { client } = fakeClient();
    await fetchTopic(topicId, client);
    const { provider, calls } = countingProvider();
    const allowed = (await getArticle("42420660"))!;
    const closed = (await getArticle("43025928"))!;

    await expect(createFullTextTranslation(closed.id, client, provider)).rejects.toMatchObject({ code: "license_not_translatable" });
    await createFullTextTranslation(allowed.id, client, provider);
    await createFullTextTranslation(allowed.id, client, provider);
    expect(calls.fullText).toHaveLength(1);
    expect(calls.fullText[0]).toContain("Sample full-text paragraph");
    expect(await prisma.articleTranslation.count({ where: { kind: "FULL_TEXT" } })).toBe(1);
  });

  it("checks the license again at translation time and follows the configured allowlist", async () => {
    const nc = parsePmcXml(fixture("pmc-PMC8438644.xml"));
    const { client } = fakeClient();
    await fetchTopic(topicId, client);
    const article = (await getArticle("42420660"))!;
    const { provider, calls } = countingProvider();

    // The publisher changed the license after we stored it.
    await expect(createFullTextTranslation(article.id, fakeClient({ fetchPmc: async () => nc }).client, provider)).rejects.toMatchObject({
      code: "license_not_translatable",
    });
    expect(await getArticle("42420660")).toMatchObject({ license: "cc-by-nc", fullTextTranslatable: false });

    // The owner's lawyer narrows the allowlist: nothing is translatable any more.
    await prisma.article.update({ where: { id: article.id }, data: { fullTextTranslatable: true } });
    await setSetting("translatableLicenses", ["cc0"]);
    await expect(createFullTextTranslation(article.id, client, provider)).rejects.toMatchObject({ code: "license_not_translatable" });
    expect(calls.fullText).toEqual([]);
  });

  it("an admin marks a translation as physician-reviewed", async () => {
    await fetchTopic(topicId, fakeClient().client);
    const article = (await getArticle("43025928"))!;
    const summary = await ensureSummary(article.id, new MockTranslationProvider());
    await setTranslationReviewed(adminId, summary.id, true);
    expect((await ensureSummary(article.id)).physicianReviewed).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: "translation.review", actorId: adminId } })).toBe(1);
    await setTranslationReviewed(adminId, summary.id, false);
    expect((await ensureSummary(article.id)).physicianReviewed).toBe(false);
    await expect(setTranslationReviewed(adminId, "no-such-id", true)).rejects.toMatchObject({ code: "not_found" });
  });
});
