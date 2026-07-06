# Offene Punkte / Pre-Launch-Checkliste

Konsolidiert aus verstreuten „vor Livegang"-Markern (README-Hinweise, `docs/`, i18n-Platzhalter).
Stand: 2026-07-04.

## Rechtlich (blockierend für Livegang)

- [ ] **Rechtstexte** Impressum / Datenschutz / AGB von Rechtsberatung befüllen lassen.
  Aktuell Platzhalter: i18n-Key `legal.placeholder` in allen 6 Sprachen; Seiten
  `apps/web/app/pages/legal/{imprint,privacy,terms}.vue`.
- [ ] **Upload-Bedingungen** finalisieren — Platzhalter `upload.termsPlaceholder`
  (i18n, alle Sprachen), abgedeckt durch e2e-Test `upload-terms-placeholder`.
- [ ] **Löschkonzept / Aufbewahrungsfristen** definieren (Rechnungen 10 Jahre!) —
  siehe `docs/privacy-consent.md`.

## Rechnung / Steuer

- [ ] **Firmen- & Rechnungsdaten** in `.env` mit echten Werten füllen (Platzhalter-Defaults
  in `apps/api/src/env.ts`): `COMPANY_NAME/STREET/ZIP/CITY/EMAIL/PHONE/WEBSITE`,
  `COMPANY_TAX_NUMBER` (Steuernummer), `COMPANY_OWNER`, `BANK_IBAN/BIC/ACCOUNT_HOLDER`.
- [ ] **Logo** hinterlegen: PNG/JPEG-Pfad in `INVOICE_LOGO_PATH` setzen (sonst Text-Briefkopf).
- [ ] **Steuermodell prüfen:** aktuell Kleinunternehmer § 19 UStG (kein USt-Ausweis).
  Bei Regelbesteuerung → USt-Spalte + Steuerblock nachrüsten (Schema-Migration nötig).
- [ ] `docs/payments.md` aktualisieren — Zeile „USt-Angaben sind Platzhalter" ist nach der
  §-19-Umsetzung veraltet.

## Integrationen (Mock → Live)

- [ ] **Stripe:** Live-Keys setzen + Webhook registrieren (`docs/payments.md`). Ohne Keys Mock-Modus.
- [ ] **Bitcoin:** echte Blockchain-API statt Mock-Provider anbinden; periodischen Sync (Cron)
  ergänzen (`docs/payments.md`).
- [ ] **Resend (E-Mails):** `RESEND_API_KEY` setzen + Absenderdomain verifizieren.
  Ohne Key: Dev-Log (`GET /api/dev/emails`).
- [ ] **Social Media Planner:** `SOCIAL_PUBLISHING_PROVIDER=meta` + `META_*`-Vars für echtes
  Publishing (`docs/social-media-planner.md`). Sonst Mock.

## Assets / Konfiguration

- [ ] **Fonts:** Momo Trust Sans (lizenzpflichtig) — WOFF2 nach `apps/web/public/fonts/` legen,
  `@font-face` in `packages/config/tailwind/fonts.css` einkommentieren. Bis dahin System-Fallback.
- [ ] **3D-Modelle:** GLB-Dateien hinterlegen (Admin-Upload oder `apps/web/public/models/<slug>.glb`),
  Meshes nach Farbzonen benannt. Ohne GLB prozedurales Fallback-Modell.
- [ ] **SEO:** `NUXT_PUBLIC_SITE_URL` auf Produktions-Domain setzen (Canonical, hreflang, Sitemap).
- [ ] **Tracking (optional):** `NUXT_PUBLIC_GA4_MEASUREMENT_ID` / `NUXT_PUBLIC_META_PIXEL_ID` —
  lädt nur nach Consent-Opt-in.

## Deployment

- [ ] Produktiv-Deploy auf Hostinger VPS gemäß `docs/deployment-hostinger.md`.
