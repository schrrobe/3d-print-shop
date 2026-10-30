-- Concurrent checkout replays and payment retries could both see sentAt = null
-- and mail the same invoice twice. A short lease claimed via compare-and-set
-- lets exactly one caller send; it expires if that caller crashes.
ALTER TABLE "Invoice" ADD COLUMN "sendLockUntil" TIMESTAMP(3);
