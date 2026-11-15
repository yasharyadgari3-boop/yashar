-- CreateEnum
CREATE TYPE "TranslationKind" AS ENUM ('SUMMARY', 'FULL_TEXT');

-- CreateTable
CREATE TABLE "PubmedTopic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastFetchedAt" TIMESTAMPTZ,

    CONSTRAINT "PubmedTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "pmid" TEXT NOT NULL,
    "pmcid" TEXT,
    "doi" TEXT,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "authors" JSONB NOT NULL,
    "journal" TEXT NOT NULL,
    "pubDateText" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ,
    "license" TEXT,
    "licenseUrl" TEXT,
    "fullTextTranslatable" BOOLEAN NOT NULL DEFAULT false,
    "licenseCheckedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleTopic" (
    "articleId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "ArticleTopic_pkey" PRIMARY KEY ("articleId","topicId")
);

-- CreateTable
CREATE TABLE "ArticleTranslation" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "kind" "TranslationKind" NOT NULL,
    "titleFa" TEXT,
    "text" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "physicianReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FetchRun" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ,
    "found" INTEGER NOT NULL DEFAULT 0,
    "added" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "FetchRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PubmedTopic_slug_key" ON "PubmedTopic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Article_pmid_key" ON "Article"("pmid");

-- CreateIndex
CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt");

-- CreateIndex
CREATE INDEX "Article_createdAt_idx" ON "Article"("createdAt");

-- CreateIndex
CREATE INDEX "ArticleTopic_topicId_idx" ON "ArticleTopic"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTranslation_articleId_kind_key" ON "ArticleTranslation"("articleId", "kind");

-- CreateIndex
CREATE INDEX "FetchRun_topicId_startedAt_idx" ON "FetchRun"("topicId", "startedAt");

-- AddForeignKey
ALTER TABLE "ArticleTopic" ADD CONSTRAINT "ArticleTopic_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTopic" ADD CONSTRAINT "ArticleTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "PubmedTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTranslation" ADD CONSTRAINT "ArticleTranslation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FetchRun" ADD CONSTRAINT "FetchRun_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "PubmedTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
