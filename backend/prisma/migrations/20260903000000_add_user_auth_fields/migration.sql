-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ORACLE', 'INSURER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "email" TEXT,
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
