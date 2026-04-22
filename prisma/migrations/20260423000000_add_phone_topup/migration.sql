-- Add phone to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

-- Create Topup table
CREATE TABLE IF NOT EXISTS "Topup" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "amount"    INTEGER NOT NULL,
  "price"     DOUBLE PRECISION NOT NULL,
  "planKey"   TEXT NOT NULL,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Topup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Topup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create SmsCode table
CREATE TABLE IF NOT EXISTS "SmsCode" (
  "id"        TEXT NOT NULL,
  "phone"     TEXT NOT NULL,
  "code"      TEXT NOT NULL,
  "used"      BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SmsCode_pkey" PRIMARY KEY ("id")
);