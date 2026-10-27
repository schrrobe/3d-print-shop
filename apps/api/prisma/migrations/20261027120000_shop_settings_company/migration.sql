-- Company identity and bank details become editable in the admin settings
-- instead of only via COMPANY_*/BANK_* env vars on the VPS. NULL keeps the env
-- value as fallback, so existing deployments behave unchanged.
ALTER TABLE "ShopSettings"
  ADD COLUMN "companyName" TEXT,
  ADD COLUMN "companyOwner" TEXT,
  ADD COLUMN "companyStreet" TEXT,
  ADD COLUMN "companyZip" TEXT,
  ADD COLUMN "companyCity" TEXT,
  ADD COLUMN "companyEmail" TEXT,
  ADD COLUMN "companyPhone" TEXT,
  ADD COLUMN "companyWebsite" TEXT,
  ADD COLUMN "companyTaxNumber" TEXT,
  ADD COLUMN "bankAccountHolder" TEXT,
  ADD COLUMN "bankIban" TEXT,
  ADD COLUMN "bankBic" TEXT;
