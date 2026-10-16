-- CreateTable
CREATE TABLE "CheckoutLead" (
    "id" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "productSlug" TEXT,
    "productName" TEXT,
    "size" TEXT,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "path" TEXT,
    "device" TEXT,
    "referrer" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageViews" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VisitorSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutLead_clientKey_key" ON "CheckoutLead"("clientKey");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutLead_orderId_key" ON "CheckoutLead"("orderId");

-- CreateIndex
CREATE INDEX "CheckoutLead_createdAt_idx" ON "CheckoutLead"("createdAt");

-- CreateIndex
CREATE INDEX "VisitorSession_lastSeenAt_idx" ON "VisitorSession"("lastSeenAt");
