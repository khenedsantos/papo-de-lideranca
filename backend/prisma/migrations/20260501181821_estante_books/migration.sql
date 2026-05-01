-- CreateEnum
CREATE TYPE "public"."BookLevel" AS ENUM ('ESSENTIAL', 'DEEPENING', 'PROVOCATION');

-- CreateEnum
CREATE TYPE "public"."BookNoteStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."Book" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "author" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverUrl" TEXT,
    "coverAlt" TEXT,
    "category" TEXT NOT NULL,
    "level" "public"."BookLevel" NOT NULL,
    "readTime" TEXT,
    "whyRead" TEXT NOT NULL,
    "whatYouWillLearn" JSONB,
    "keyIdeas" JSONB,
    "guidedQuestions" JSONB,
    "practicalUse" TEXT,
    "relatedArticleSlugs" JSONB,
    "relatedShortEditionSlugs" JSONB,
    "purchaseUrl" TEXT,
    "purchaseLabel" TEXT,
    "purchaseProvider" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "public"."BookNoteStatus" NOT NULL DEFAULT 'PENDING',
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_slug_key" ON "public"."Book"("slug");

-- CreateIndex
CREATE INDEX "Book_category_idx" ON "public"."Book"("category");

-- CreateIndex
CREATE INDEX "Book_level_idx" ON "public"."Book"("level");

-- CreateIndex
CREATE INDEX "Book_isActive_displayOrder_idx" ON "public"."Book"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "BookNote_bookId_status_isHighlighted_idx" ON "public"."BookNote"("bookId", "status", "isHighlighted");

-- CreateIndex
CREATE INDEX "BookNote_userId_idx" ON "public"."BookNote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookNote_userId_bookId_promptKey_key" ON "public"."BookNote"("userId", "bookId", "promptKey");

-- AddForeignKey
ALTER TABLE "public"."BookNote" ADD CONSTRAINT "BookNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookNote" ADD CONSTRAINT "BookNote_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "public"."Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
