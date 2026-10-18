-- CreateTable
CREATE TABLE "CustomProduct" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER,
    "compareAtPriceCents" INTEGER,
    "sizes" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "mainImageId" TEXT,
    "galleryIds" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomProduct_pkey" PRIMARY KEY ("slug")
);
