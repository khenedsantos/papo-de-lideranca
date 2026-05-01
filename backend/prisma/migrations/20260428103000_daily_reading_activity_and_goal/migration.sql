-- AlterTable
ALTER TABLE "public"."User"
ADD COLUMN     "weeklyReadingTarget" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "public"."DailyReadingActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityDate" DATE NOT NULL,
    "minutesRead" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReadingActivity_pkey" PRIMARY KEY ("id")
);

-- Backfill from existing progress so current accounts do not start from zero.
INSERT INTO "public"."DailyReadingActivity" (
    "id",
    "userId",
    "activityDate",
    "minutesRead",
    "completedCount",
    "createdAt",
    "updatedAt"
)
SELECT
    CONCAT('daily_', md5(CONCAT(rp."userId", '|', ((((rp."lastReadAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date)::text)))) AS "id",
    rp."userId",
    (((rp."lastReadAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date) AS "activityDate",
    SUM(
      GREATEST(
        0,
        ROUND((COALESCE(a."readTimeMinutes", se."readTimeMinutes", 0) * rp."progressPercent")::numeric / 100)
      )::int
    ) AS "minutesRead",
    SUM(
      CASE
        WHEN rp."status" = 'COMPLETED'::"public"."ReadingProgressStatus" THEN 1
        ELSE 0
      END
    )::int AS "completedCount",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "public"."ReadingProgress" rp
LEFT JOIN "public"."Article" a ON a."id" = rp."articleId"
LEFT JOIN "public"."ShortEdition" se ON se."id" = rp."shortEditionId"
WHERE rp."progressPercent" > 0
GROUP BY
    rp."userId",
    (((rp."lastReadAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date)
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE INDEX "DailyReadingActivity_userId_activityDate_idx" ON "public"."DailyReadingActivity"("userId", "activityDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReadingActivity_userId_activityDate_key" ON "public"."DailyReadingActivity"("userId", "activityDate");

-- AddForeignKey
ALTER TABLE "public"."DailyReadingActivity" ADD CONSTRAINT "DailyReadingActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
