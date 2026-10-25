-- Conversion-API match data (IP, user agent, _fbp/_fbc/_ttp) captured at
-- checkout with marketing consent, so the payment-time purchase event can be
-- sent to Meta/TikTok server-side. Short-lived: cleared on enqueue/retention.
ALTER TABLE "Order" ADD COLUMN "trackingAttribution" JSONB;
