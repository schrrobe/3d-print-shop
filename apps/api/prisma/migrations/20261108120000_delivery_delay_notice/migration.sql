-- Admin-schaltbarer Checkout-Hinweis, dass die Lieferzeit aktuell ca. 4 Wochen beträgt.
ALTER TABLE "ShopSettings" ADD COLUMN "deliveryDelayNotice" BOOLEAN NOT NULL DEFAULT false;
