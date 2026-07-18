-- Dashboard freshness query orders TrackingEvent by receivedAt; index it so the
-- lookup stays a cheap index scan as the table grows toward its retention horizon.
CREATE INDEX "TrackingEvent_receivedAt_idx" ON "TrackingEvent"("receivedAt");
