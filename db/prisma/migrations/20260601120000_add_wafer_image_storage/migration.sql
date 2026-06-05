-- CreateEnum
CREATE TYPE "WaferImageType" AS ENUM ('RAW_BIN_MAP', 'DEFECT_MASK', 'GRADCAM_OVERLAY', 'PROCESSED_THUMBNAIL');

-- CreateEnum
CREATE TYPE "StorageBackend" AS ENUM ('POSTGRES', 'MINIO');

-- CreateTable
CREATE TABLE "WaferImage" (
    "id" TEXT NOT NULL,
    "waferId" TEXT NOT NULL,
    "aiWaferId" TEXT,
    "imageType" "WaferImageType" NOT NULL,
    "storageBackend" "StorageBackend" NOT NULL DEFAULT 'POSTGRES',
    "rawBytes" BYTEA,
    "storageKey" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'image/png',
    "fileSizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaferImage_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AiWafer" ADD COLUMN     "waferImageId" TEXT;

-- CreateIndex
CREATE INDEX "WaferImage_waferId_idx" ON "WaferImage"("waferId");

-- CreateIndex
CREATE INDEX "WaferImage_waferId_imageType_idx" ON "WaferImage"("waferId", "imageType");

-- CreateIndex
CREATE UNIQUE INDEX "WaferImage_waferId_imageType_key" ON "WaferImage"("waferId", "imageType");

-- AddForeignKey
ALTER TABLE "WaferImage" ADD CONSTRAINT "WaferImage_waferId_fkey" FOREIGN KEY ("waferId") REFERENCES "Wafer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
