-- Warnings/errors from cron jobs, mail and 500s only showed up in stdout.
-- Persist them for the admin error log; rows are purged after 14 days.
CREATE TYPE "ErrorLogLevel" AS ENUM ('warn', 'error');

CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "level" "ErrorLogLevel" NOT NULL,
    "context" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");
