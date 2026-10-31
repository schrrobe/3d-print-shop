-- §19 UStG small-business status becomes an admin setting instead of env-only.
-- NULL keeps the COMPANY_VAT_EXEMPT env fallback for existing installs.
ALTER TABLE "ShopSettings" ADD COLUMN "vatExempt" BOOLEAN;
