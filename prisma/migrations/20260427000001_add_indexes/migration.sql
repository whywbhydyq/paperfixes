-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "Job_userId_idx" ON "Job"("userId");
CREATE INDEX IF NOT EXISTS "Topup_userId_idx" ON "Topup"("userId");
CREATE INDEX IF NOT EXISTS "SmsCode_phone_expiresAt_idx" ON "SmsCode"("phone", "expiresAt");
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
