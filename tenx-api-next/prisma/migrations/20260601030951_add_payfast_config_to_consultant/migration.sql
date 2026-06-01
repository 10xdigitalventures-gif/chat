-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConsultantServiceConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultantUserId" TEXT NOT NULL,
    "textRate" REAL NOT NULL DEFAULT 0,
    "audioRate" REAL NOT NULL DEFAULT 0,
    "videoRate" REAL NOT NULL DEFAULT 0,
    "imageRate" REAL NOT NULL DEFAULT 0,
    "fileRate" REAL NOT NULL DEFAULT 0,
    "stripeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeAccountId" TEXT,
    "jazzCashEnabled" BOOLEAN NOT NULL DEFAULT false,
    "jazzCashAccount" TEXT,
    "easyPaisaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "easyPaisaAccount" TEXT,
    "payFastEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payFastMerchantId" TEXT,
    "payFastSecuredKey" TEXT,
    CONSTRAINT "ConsultantServiceConfig_consultantUserId_fkey" FOREIGN KEY ("consultantUserId") REFERENCES "ConsultantProfile" ("userId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ConsultantServiceConfig" ("audioRate", "consultantUserId", "easyPaisaAccount", "easyPaisaEnabled", "fileRate", "id", "imageRate", "jazzCashAccount", "jazzCashEnabled", "stripeAccountId", "stripeEnabled", "textRate", "videoRate") SELECT "audioRate", "consultantUserId", "easyPaisaAccount", "easyPaisaEnabled", "fileRate", "id", "imageRate", "jazzCashAccount", "jazzCashEnabled", "stripeAccountId", "stripeEnabled", "textRate", "videoRate" FROM "ConsultantServiceConfig";
DROP TABLE "ConsultantServiceConfig";
ALTER TABLE "new_ConsultantServiceConfig" RENAME TO "ConsultantServiceConfig";
CREATE UNIQUE INDEX "ConsultantServiceConfig_consultantUserId_key" ON "ConsultantServiceConfig"("consultantUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
