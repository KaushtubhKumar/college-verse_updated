/*
  Warnings:

  - Added the required column `description` to the `Community` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Community" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "icon" TEXT;
