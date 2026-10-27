-- Optional blind-copy recipient for invoice emails (e.g. a bookkeeping inbox),
-- editable in the admin settings next to the company data.
ALTER TABLE "ShopSettings" ADD COLUMN "invoiceBccEmail" TEXT;
