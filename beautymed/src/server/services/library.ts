import "server-only";
import { z } from "zod";
import { defaultTopics, isFullTextTranslatable, licenseCodeFromUrl } from "@/lib/pubmed";
import { fieldErrors } from "@/lib/validators";
import { Prisma } from "@/generated/prisma/client";
import type { PubmedClient } from "@/server/adapters/pubmed";
import { getTranslationProvider, type TranslationProvider } from "@/server/adapters/translation";
import { prisma } from "@/server/db";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { audit } from "@/server/services/audit";
import { getSetting } from "@/server/services/settings";

const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/* ---------------- Topics (saved searches) ---------------- */

export const topicSchema = z.object({
  id: z.string().max(40).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "نشانی کوتاه فقط با حروف کوچک لاتین، عدد و خط تیره نوشته می‌شود.")
    .min(2)
    .max(60),
  title: z.string().trim().min(2, "عنوان موضوع را وارد کنید.").max(120),
  query: z.string().trim().min(3, "عبارت جست‌وجوی PubMed را وارد کنید.").max(1000),
  enabled: z.boolean(),
});

/** Create the default saved searches once (existing topics are left as the admin edited them). */
export async function ensureDefaultTopics(): Promise<void> {
  for (const [index, topic] of defaultTopics.entries()) {
    await prisma.pubmedTopic.upsert({ where: { slug: topic.slug }, create: { ...topic, sortOrder: index }, update: {} });
  }
}

export function listTopics(onlyEnabled = false) {
  return prisma.pubmedTopic.findMany({
    where: onlyEnabled ? { enabled: true } : {},
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, slug: true, title: true, query: true, enabled: true, lastFetchedAt: true, _count: { select: { articles: true } } },
  });
}

export async function saveTopic(adminId: string, input: unknown): Promise<void> {
  const parsed = topicSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("اطلاعات واردشده را بررسی کنید.", fieldErrors(parsed.error));
  const { id, ...data } = parsed.data;
  try {
    if (id) {
      const done = await prisma.pubmedTopic.updateMany({ where: { id }, data });
      if (done.count === 0) throw new NotFoundError("موضوع پیدا نشد.");
    } else {
      await prisma.pubmedTopic.create({ data: { ...data, sortOrder: await prisma.pubmedTopic.count() } });
    }
  } catch (error) {
    if (isUnique(error)) throw new ConflictError("موضوعی با این نشانی کوتاه وجود دارد.");
    throw error;
  }
  await audit({ actorId: adminId, action: id ? "pubmed.topic_updated" : "pubmed.topic_created", entity: "PubmedTopic", entityId: id });
}

/* ---------------- Fetching ---------------- */

export type FetchResult = { found: number; added: number };

/**
 * Run one saved search and store articles we do not have yet. For each new article in PMC the
 * license is read and stored, and that decides whether a full-text translation may be offered.
 * Every run is recorded, including failures.
 */
export async function fetchTopic(topicId: string, client: PubmedClient, limit = 10): Promise<FetchResult> {
  const topic = await prisma.pubmedTopic.findUnique({ where: { id: topicId }, select: { id: true, query: true } });
  if (!topic) throw new NotFoundError("موضوع پیدا نشد.");
  const run = await prisma.fetchRun.create({ data: { topicId }, select: { id: true } });
  try {
    const allowlist = await getSetting("translatableLicenses");
    const { pmids } = await client.search(topic.query, limit);
    const known = await prisma.article.findMany({ where: { pmid: { in: pmids } }, select: { id: true, pmid: true } });
    const knownPmids = new Set(known.map((a) => a.pmid));
    const records = await client.fetchRecords(pmids.filter((p) => !knownPmids.has(p)));

    let added = 0;
    const articleIds = known.map((a) => a.id);
    for (const record of records) {
      // The network call happens before, and outside, any database write.
      const pmc = record.pmcid ? await client.fetchPmc(record.pmcid).catch(() => null) : null;
      try {
        const article = await prisma.article.create({
          data: {
            ...record,
            license: licenseCodeFromUrl(pmc?.licenseUrl),
            licenseUrl: pmc?.licenseUrl ?? null,
            fullTextTranslatable: pmc ? isFullTextTranslatable(pmc, allowlist) : false,
            licenseCheckedAt: pmc ? new Date() : null,
          },
          select: { id: true },
        });
        articleIds.push(article.id);
        added += 1;
      } catch (error) {
        if (!isUnique(error)) throw error; // another run stored it at the same moment
        const existing = await prisma.article.findUnique({ where: { pmid: record.pmid }, select: { id: true } });
        if (existing) articleIds.push(existing.id);
      }
    }
    await prisma.articleTopic.createMany({ data: articleIds.map((articleId) => ({ articleId, topicId })), skipDuplicates: true });
    const now = new Date();
    await prisma.$transaction([
      prisma.fetchRun.update({ where: { id: run.id }, data: { finishedAt: now, found: pmids.length, added } }),
      prisma.pubmedTopic.update({ where: { id: topicId }, data: { lastFetchedAt: now } }),
    ]);
    return { found: pmids.length, added };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "unknown error";
    await prisma.fetchRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), error: message } });
    throw error;
  }
}

/** Run every enabled saved search (used by the scheduled job). One failing topic does not stop the others. */
export async function fetchAllTopics(client: PubmedClient, limit = 10): Promise<Array<{ slug: string } & (FetchResult | { error: string })>> {
  const topics = await prisma.pubmedTopic.findMany({ where: { enabled: true }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true } });
  const results = [];
  for (const topic of topics) {
    try {
      results.push({ slug: topic.slug, ...(await fetchTopic(topic.id, client, limit)) });
    } catch (error) {
      results.push({ slug: topic.slug, error: error instanceof Error ? error.message : "unknown error" });
    }
  }
  return results;
}

export function listRecentRuns(take = 15) {
  return prisma.fetchRun.findMany({
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take,
    select: { id: true, startedAt: true, found: true, added: true, error: true, topic: { select: { title: true } } },
  });
}

/* ---------------- Reading ---------------- */

const cardSelect = {
  pmid: true,
  title: true,
  journal: true,
  pubDateText: true,
  publishedAt: true,
  translations: { where: { kind: "SUMMARY" as const }, select: { titleFa: true, physicianReviewed: true } },
};

export function listArticles(filter: { topicSlug?: string; take?: number } = {}) {
  return prisma.article.findMany({
    where: filter.topicSlug ? { topics: { some: { topic: { slug: filter.topicSlug } } } } : {},
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }],
    take: filter.take ?? 30,
    select: cardSelect,
  });
}

export function getArticle(pmid: string) {
  return prisma.article.findUnique({
    where: { pmid },
    select: {
      id: true,
      pmid: true,
      pmcid: true,
      doi: true,
      title: true,
      authors: true,
      journal: true,
      pubDateText: true,
      publishedAt: true,
      license: true,
      licenseUrl: true,
      fullTextTranslatable: true,
      topics: { select: { topic: { select: { slug: true, title: true } } } },
      translations: { select: { id: true, kind: true, titleFa: true, text: true, provider: true, physicianReviewed: true } },
    },
  });
}

export async function searchArticles(normalizedQuery: string, take = 10) {
  if (!normalizedQuery) return [];
  return prisma.article.findMany({
    where: {
      OR: [
        { title: { contains: normalizedQuery, mode: "insensitive" } },
        { translations: { some: { titleFa: { contains: normalizedQuery, mode: "insensitive" } } } },
      ],
    },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "desc" }],
    take,
    select: { pmid: true, title: true },
  });
}

/* ---------------- Translation on demand, then cached ---------------- */

/**
 * The Persian title and summary are produced the first time someone opens the article and are
 * reused afterwards, so translation cost follows actual reading.
 */
export async function ensureSummary(articleId: string, provider: TranslationProvider = getTranslationProvider()) {
  const select = { id: true, kind: true, titleFa: true, text: true, provider: true, physicianReviewed: true };
  const existing = await prisma.articleTranslation.findUnique({ where: { articleId_kind: { articleId, kind: "SUMMARY" } }, select });
  if (existing) return existing;
  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { title: true, abstract: true } });
  if (!article) throw new NotFoundError();
  const result = await provider.summarize(article);
  try {
    return await prisma.articleTranslation.create({
      data: { articleId, kind: "SUMMARY", titleFa: result.titleFa.slice(0, 500), text: result.summaryFa.slice(0, 5000), provider: provider.name },
      select,
    });
  } catch (error) {
    if (!isUnique(error)) throw error; // two readers opened it at once; keep the first result
    return prisma.articleTranslation.findUniqueOrThrow({ where: { articleId_kind: { articleId, kind: "SUMMARY" } }, select });
  }
}

/**
 * Full-text translation, only for articles whose stored license allows commercial derivative
 * works. The license is read again from PMC at this moment, so a changed or withdrawn license
 * blocks the translation.
 */
export async function createFullTextTranslation(
  articleId: string,
  client: PubmedClient,
  provider: TranslationProvider = getTranslationProvider(),
): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, pmcid: true, fullTextTranslatable: true, translations: { where: { kind: "FULL_TEXT" }, select: { id: true } } },
  });
  if (!article) throw new NotFoundError();
  if (article.translations.length > 0) return;
  const refuse = () => new AppError("مجوز این مقاله اجازه‌ی ترجمه‌ی متن کامل را نمی‌دهد. متن کامل در منبع اصلی است.", "license_not_translatable", 403);
  if (!article.fullTextTranslatable || !article.pmcid) throw refuse();

  const pmc = await client.fetchPmc(article.pmcid);
  const stillAllowed = isFullTextTranslatable(pmc, await getSetting("translatableLicenses"));
  await prisma.article.update({
    where: { id: articleId },
    data: { license: licenseCodeFromUrl(pmc.licenseUrl), licenseUrl: pmc.licenseUrl, fullTextTranslatable: stillAllowed, licenseCheckedAt: new Date() },
  });
  if (!stillAllowed) throw refuse();

  const text = await provider.translateFullText({ title: article.title, text: pmc.fullText });
  await prisma.articleTranslation
    .create({ data: { articleId, kind: "FULL_TEXT", text: text.slice(0, 200_000), provider: provider.name } })
    .catch((error) => {
      if (!isUnique(error)) throw error;
    });
}

/** An admin records (or withdraws) a physician's review of a translation. */
export async function setTranslationReviewed(adminId: string, translationId: string, reviewed: boolean): Promise<void> {
  const done = await prisma.articleTranslation.updateMany({
    where: { id: translationId },
    data: { physicianReviewed: reviewed, reviewedById: reviewed ? adminId : null, reviewedAt: reviewed ? new Date() : null },
  });
  if (done.count === 0) throw new NotFoundError();
  await audit({ actorId: adminId, action: "translation.review", entity: "ArticleTranslation", entityId: translationId, meta: { reviewed } });
}
