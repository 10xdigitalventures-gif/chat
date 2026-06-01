/*
  Warnings:

  - You are about to drop the `AuditLogs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AuditLogs";
PRAGMA foreign_keys=on;
