/*
  Warnings:

  - You are about to drop the column `content` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Question` table. All the data in the column will be lost.
  - Added the required column `body` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `body` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "content",
ADD COLUMN     "body" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "content",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;
