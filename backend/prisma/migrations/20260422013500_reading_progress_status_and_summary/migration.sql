-- CreateEnum
CREATE TYPE "public"."ReadingProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "public"."ReadingProgress"
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "status" "public"."ReadingProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
ALTER COLUMN   "progressPercent" SET DEFAULT 0,
ALTER COLUMN   "lastReadAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Backfill
UPDATE "public"."ReadingProgress"
SET "status" = CASE
    WHEN "progressPercent" >= 100 THEN 'COMPLETED'::"public"."ReadingProgressStatus"
    WHEN "progressPercent" > 0 THEN 'IN_PROGRESS'::"public"."ReadingProgressStatus"
    ELSE 'NOT_STARTED'::"public"."ReadingProgressStatus"
  END,
  "completedAt" = CASE
    WHEN "progressPercent" >= 100 THEN COALESCE("lastReadAt", CURRENT_TIMESTAMP)
    ELSE NULL
  END;

-- CreateIndex
CREATE INDEX "ReadingProgress_userId_status_idx" ON "public"."ReadingProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "ReadingProgress_userId_lastReadAt_idx" ON "public"."ReadingProgress"("userId", "lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_userId_articleId_key" ON "public"."ReadingProgress"("userId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_userId_shortEditionId_key" ON "public"."ReadingProgress"("userId", "shortEditionId");
