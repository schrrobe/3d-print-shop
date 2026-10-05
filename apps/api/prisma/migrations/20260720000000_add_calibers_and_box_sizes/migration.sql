-- kaliberbox.de: products are cartridge boxes per caliber. Calibers become a
-- first-class table (m:n to Product) so the shop can filter by caliber, and
-- Product gets a box capacity (50/100 rounds) plus a familyKey that groups the
-- 50/100 size variants of one caliber box.

-- CreateEnum
CREATE TYPE "CaliberGroup" AS ENUM ('HANDGUN', 'RIFLE', 'RIMFIRE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "capacity" INTEGER,
ADD COLUMN "familyKey" TEXT;

-- CreateTable
CREATE TABLE "Caliber" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" "CaliberGroup" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caliber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CaliberToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CaliberToProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Caliber_slug_key" ON "Caliber"("slug");

-- CreateIndex
CREATE INDEX "Product_familyKey_idx" ON "Product"("familyKey");

-- CreateIndex
CREATE INDEX "_CaliberToProduct_B_index" ON "_CaliberToProduct"("B");

-- AddForeignKey
ALTER TABLE "_CaliberToProduct" ADD CONSTRAINT "_CaliberToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Caliber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CaliberToProduct" ADD CONSTRAINT "_CaliberToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
