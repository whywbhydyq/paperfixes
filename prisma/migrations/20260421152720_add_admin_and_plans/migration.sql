-- CreateTable
CREATE TABLE "Config" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "passwordHash" TEXT,
    "wechatOpenId" TEXT,
    "wechatName" TEXT,
    "wechatAvatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "quota" INTEGER NOT NULL DEFAULT 5,
    "totalUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "passwordHash", "quota", "totalUsed", "wechatAvatar", "wechatName", "wechatOpenId") SELECT "createdAt", "email", "id", "passwordHash", "quota", "totalUsed", "wechatAvatar", "wechatName", "wechatOpenId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_wechatOpenId_key" ON "User"("wechatOpenId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
