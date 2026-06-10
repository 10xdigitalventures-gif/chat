-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_locationTypeId_fkey";

-- DropForeignKey
ALTER TABLE "RoleMenuEntry" DROP CONSTRAINT "RoleMenuEntry_locationId_fkey";

-- DropForeignKey
ALTER TABLE "RoleModule" DROP CONSTRAINT "RoleModule_locationId_fkey";

-- DropForeignKey
ALTER TABLE "UserLoginPreference" DROP CONSTRAINT "UserLoginPreference_fiscalYearId_fkey";

-- DropForeignKey
ALTER TABLE "UserLoginPreference" DROP CONSTRAINT "UserLoginPreference_locationId_fkey";

-- DropForeignKey
ALTER TABLE "UserLoginPreference" DROP CONSTRAINT "UserLoginPreference_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_locationId_fkey";

-- AlterTable
ALTER TABLE "RoleMenuEntry" DROP COLUMN "locationId";

-- AlterTable
ALTER TABLE "RoleModule" DROP COLUMN "locationId";

-- AlterTable
ALTER TABLE "UserPermission" DROP COLUMN "locationId";

-- DropTable
DROP TABLE "FiscalYear";

-- DropTable
DROP TABLE "Location";

-- DropTable
DROP TABLE "LocationType";

-- DropTable
DROP TABLE "UserLoginPreference";

