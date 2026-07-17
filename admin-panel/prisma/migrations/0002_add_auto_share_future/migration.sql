-- AlterTable: Add autoShareFuture column to AdminUser
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "autoShareFuture" BOOLEAN NOT NULL DEFAULT false;
