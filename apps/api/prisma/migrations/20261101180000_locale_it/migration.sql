-- The shop now ships an Italian storefront; orders, tickets, reviews and
-- product translations store the customer's locale, so the enum needs "it".
ALTER TYPE "Locale" ADD VALUE 'it';
