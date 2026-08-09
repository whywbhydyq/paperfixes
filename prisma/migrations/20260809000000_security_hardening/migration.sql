ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3);

ALTER TABLE "SmsCode"
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "requestIp" TEXT;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "providerTradeNo" TEXT;

CREATE INDEX IF NOT EXISTS "SmsCode_requestIp_createdAt_idx"
  ON "SmsCode"("requestIp", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Order_providerTradeNo_key"
  ON "Order"("providerTradeNo");
