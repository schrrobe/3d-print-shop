-- Track invoice email delivery separately from the PDF: a rendered PDF does not
-- prove the email went out, so failed sends can be retried. Existing invoices
-- with a PDF were treated as sent by the old logic — backfill them.
ALTER TABLE "Invoice" ADD COLUMN "sentAt" TIMESTAMP(3);
UPDATE "Invoice" SET "sentAt" = "issuedAt" WHERE "pdfPath" IS NOT NULL;
