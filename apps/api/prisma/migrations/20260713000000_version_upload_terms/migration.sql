-- Preserve the exact published upload-condition version accepted per request.
ALTER TABLE "QuoteRequest" ADD COLUMN "uploadTermsVersion" TEXT;
