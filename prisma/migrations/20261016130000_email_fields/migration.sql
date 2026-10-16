-- AlterTable
ALTER TABLE "Order" ADD COLUMN "emailPaidAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "emailExpiredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CheckoutLead" ADD COLUMN "emailSentAt" TIMESTAMP(3);
