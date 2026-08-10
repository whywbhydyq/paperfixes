-- Add platform-independent, one-time plan redemption codes.
-- Only a SHA-256 digest and a short non-secret hint are persisted; plaintext
-- codes are returned once at generation time and are never stored.
CREATE TABLE IF NOT EXISTS "RedemptionCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeHint" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "quota" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "batchId" TEXT,
    "note" TEXT,
    "redeemedById" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RedemptionCode_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RedemptionCode_redeemedById_fkey"
      FOREIGN KEY ("redeemedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "RedemptionCode_codeHash_key"
  ON "RedemptionCode"("codeHash");

CREATE INDEX IF NOT EXISTS "RedemptionCode_batchId_idx"
  ON "RedemptionCode"("batchId");

CREATE INDEX IF NOT EXISTS "RedemptionCode_redeemedById_redeemedAt_idx"
  ON "RedemptionCode"("redeemedById", "redeemedAt");

CREATE INDEX IF NOT EXISTS "RedemptionCode_source_createdAt_idx"
  ON "RedemptionCode"("source", "createdAt");
