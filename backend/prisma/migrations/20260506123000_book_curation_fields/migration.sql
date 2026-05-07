-- Add curator-facing metadata to books so the API is the single source of truth.
ALTER TABLE "public"."Book" ADD COLUMN "curationNote" TEXT;
ALTER TABLE "public"."Book" ADD COLUMN "impactLabel" TEXT;
