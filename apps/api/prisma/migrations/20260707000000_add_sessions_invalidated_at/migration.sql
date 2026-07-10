-- Sessions issued before this timestamp are rejected (set on logout).
ALTER TABLE "User" ADD COLUMN "sessionsInvalidatedAt" TIMESTAMP(3);
