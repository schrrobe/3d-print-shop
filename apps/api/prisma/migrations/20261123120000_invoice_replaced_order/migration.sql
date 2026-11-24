-- A cancelled order can be reactivated (payment arrived after the cancel). Its cancelled
-- invoice stays as issued (GoBD) but moves to replacedOrderId, so the order can get a
-- new current invoice under the unique orderId. Every invoice belongs to exactly one order.
ALTER TABLE "Invoice" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "Invoice" ADD COLUMN "replacedOrderId" TEXT;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_one_order_check"
  CHECK (("orderId" IS NULL) <> ("replacedOrderId" IS NULL));
CREATE INDEX "Invoice_replacedOrderId_idx" ON "Invoice"("replacedOrderId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_replacedOrderId_fkey" FOREIGN KEY ("replacedOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
