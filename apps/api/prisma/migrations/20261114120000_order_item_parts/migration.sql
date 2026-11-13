-- Production ticks off the three Bauteile (Gehäuse, Einsatz, Deckel & Verschluss)
-- per order item; customers see the Fertigungsstand on the order page and portal.
CREATE TYPE "PartStatus" AS ENUM ('open', 'in_progress', 'done');

ALTER TABLE "OrderItem"
  ADD COLUMN "housingStatus" "PartStatus" NOT NULL DEFAULT 'open',
  ADD COLUMN "insertStatus" "PartStatus" NOT NULL DEFAULT 'open',
  ADD COLUMN "lidStatus" "PartStatus" NOT NULL DEFAULT 'open';
