-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('delivery', 'pickup');

-- CreateEnum
CREATE TYPE "ReviewFit" AS ENUM ('runs_small', 'true_to_size', 'runs_large');

-- CreateEnum
CREATE TYPE "StockAlertKind" AS ENUM ('back_in_stock', 'price_drop');

-- AlterTable
ALTER TABLE "DeliveryZone" ADD COLUMN     "pickupAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pickupFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pickupLocation" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'delivery';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "spinImages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ProductColorVariant" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ProductSize" ADD COLUMN     "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockQuantity" INTEGER;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "fit" "ReviewFit";

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "customerId" TEXT,
    "size" TEXT,
    "color" TEXT,
    "kind" "StockAlertKind" NOT NULL,
    "priceAtSignup" DECIMAL(12,2),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCart" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockAlert_productId_notifiedAt_idx" ON "StockAlert"("productId", "notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockAlert_productId_email_kind_size_key" ON "StockAlert"("productId", "email", "kind", "size");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerCart_customerId_key" ON "CustomerCart"("customerId");

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCart" ADD CONSTRAINT "CustomerCart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
