# Designsystem

Quelle der Wahrheit: `packages/config/tailwind/theme.css` (Tailwind 4, CSS-first).
Vorschau: Storybook → „Showcase/…" (Typography, Color Palette, Spacing, Radius, Theme Preview).

## Farben

| Token | Wert | Verwendung |
|---|---|---|
| brand-green | `#31a871` | CTA — nur für die wichtigste Aktion pro Screen |
| surface-dark | `#171717` | Dark-Theme-Fläche (primäres Markendesign) |
| surface-warm | `#f6f3ec` | Light-Theme-Fläche |
| text-dark / text-primary-white | `#000` / `#fff` | Primärtext je Theme |
| text-secondary | `#5e5e5e` | Sekundärtext (Light) — im Dark-Theme auf `#a6a6a6` angehoben (WCAG AA) |
| border-subtle | schwarz/weiß transluzent | Feine Linien |

Semantische, theme-wechselnde Utilities: `bg-surface`, `bg-surface-elevated`, `text-primary`,
`text-secondary`, `border-subtle`, `bg-brand`, `text-on-brand`, `bg-white-translucent`.

## Typografie

Primärschrift **Momo Trust Sans** (SemiBold 600 / Medium 500 / Regular 400) mit System-Fallback.
Font-Dateien sind nicht enthalten — Ablage + Aktivierung siehe README („Fonts").

Type Scale (Utilities `text-<name>`): display-xl 96/100.8/-2.88 · display-large 72/75.6/-2.16 ·
display-medium 64/70.4/-1.28 · heading-large 44/52.8/-0.44 · heading-medium 40/48/-1.6 ·
heading-small 32/38.4/-1.28 · subheading 24/28.8/-0.96 · label-medium 16/17.6/+0.32 (500) ·
body-regular 14/19.6 (400) · caption 15/16.5 (600).

## Spacing & Radius

Spacing-Utilities (`p-*`, `gap-*`, …): xs 4 · sm 8 · md-sm 10 · md 16 · md-lg 18 · lg 24 ·
xl 32 · 2xl 40 · 3xl 56 · 4xl 64 · 5xl 80 · 6xl 120 (px).

Radius (`rounded-*`): card 10 · pill-small 21.5 · pill-medium 42 · pill-large 46 · pill-xl 50 ·
pill-2xl 52 · pill-3xl 56 · pill-4xl 66 · pill-max 150 · full-pill 400 (px).

Einziger sanktionierter Schatten: `shadow-card` (0 2px 12px rgba(0,0,0,.1)).

## Theme-System

- Dark = Default und Markendesign (`:root`), Light via `[data-theme='light']` / `.light`.
- Modi: Dark / Light / System, manueller Toggle (`PsThemeToggle`), Persistenz in
  localStorage (`print-shop-color-mode`, via `@nuxtjs/color-mode`, Cookie-frei SSR-safe).
- CTA bleibt in beiden Themes brand-green.

## Regeln

- Pill-Formen großzügig für Buttons, Navigation, Badges (`PsPillButton`, `PsNavPill`, `PsBadge`).
- Primärfarbe nur für die wichtigste Aktion pro Screen.
- WCAG-AA-Kontrast (per axe in `accessibility.spec.ts` getestet).
- Animationen: GSAP + ScrollTrigger nur auf Marketing-Seiten, niemals im Checkout;
  Adminbereich nur dezent; `prefers-reduced-motion` wird global respektiert
  (CSS-Kill-Switch in theme.css + Guards in `useMotion`/`useReducedMotion`).
