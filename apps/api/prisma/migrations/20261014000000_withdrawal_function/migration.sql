-- § 356a BGB withdrawal function: declarations are stored as support tickets.
ALTER TYPE "TicketCategory" ADD VALUE 'withdrawal';

-- Colour/size choice from the shop palette does not exclude the statutory
-- withdrawal right (§ 312g Abs. 2 Nr. 1 BGB). Only real made-to-spec items are
-- custom-made; see docs/legal/audit-2026-10-14.md.
ALTER TABLE "Product" ALTER COLUMN "customMade" SET DEFAULT false;
UPDATE "Product" SET "customMade" = false;
