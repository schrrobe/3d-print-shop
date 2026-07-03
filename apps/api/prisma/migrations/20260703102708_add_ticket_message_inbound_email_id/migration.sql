-- AlterTable
ALTER TABLE "TicketMessage" ADD COLUMN "inboundEmailId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TicketMessage_inboundEmailId_key" ON "TicketMessage"("inboundEmailId");
