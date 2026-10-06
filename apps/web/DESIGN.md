---
name: kaliberbox.de
description: Caliber-specific 3D-printed cartridge boxes, chosen like placing a shot on a target.
colors:
  hit: '#c2410c'
  on-hit: '#ffffff'
  hit-soft: 'rgba(194, 65, 12, 0.1)'
  mirror: '#121417'
  mirror-2: '#1d2126'
  on-mirror: '#f3f1ea'
  on-mirror-2: '#a9aeb5'
  paper: '#f3f1ea'
  paper-raised: '#fbfaf6'
  paper-sunk: '#e8e5da'
  ink: '#121417'
  ink-2: '#4a4f57'
  rule: '#d3cec1'
  rule-strong: '#85806f'
  ok: '#2f6b3f'
  warn: '#8a5a00'
  error: '#b42318'
typography:
  display:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '3rem'
    fontWeight: 760
    lineHeight: 0.92
    letterSpacing: '-0.01em'
    fontVariation: "'wdth' 68"
  headline:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: '-0.01em'
    fontVariation: "'wdth' 82"
  title:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.35
  tick:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    letterSpacing: '0.06em'
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 112"
rounded:
  edge: '2px'
spacing:
  gutter-mobile: '1rem'
  gutter-desktop: '2rem'
  section-mobile: '3.5rem'
  section-desktop: '5rem'
  container: '76rem'
components:
  button-hit:
    backgroundColor: '{colors.hit}'
    textColor: '{colors.on-hit}'
    rounded: '{rounded.edge}'
    padding: '0.75rem 1.25rem'
    height: '3rem'
  button-ink:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    rounded: '{rounded.edge}'
    padding: '0.75rem 1.25rem'
    height: '3rem'
  button-line:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.edge}'
    padding: '0.75rem 1.25rem'
    height: '3rem'
  button-line-hover:
    backgroundColor: '{colors.paper-sunk}'
  button-quiet:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    padding: '0.75rem 0.5rem'
    height: '2.75rem'
  input:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.ink}'
    rounded: '{rounded.edge}'
    padding: '0.625rem 0.875rem'
    height: '3rem'
  chip-caliber:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.edge}'
    padding: '0.5rem 0.875rem'
    height: '2.75rem'
  chip-caliber-selected:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
  buy-bar:
    backgroundColor: '{colors.mirror}'
    textColor: '{colors.on-mirror}'
---

# Design System: kaliberbox.de

## Overview

**Creative North Star: "Die Ringscheibe"**

The storefront is a paper shooting target. Card-stock paper is the ground, a flat black "mirror" (the black centre of a target) is the one large colour field, thin 1px ring lines and small wide ring numbers organise everything, and a single signal-orange hit marks the choice and the primary action. Choosing a caliber is placing a shot: the hit flies into the centre of the target and the caliber name lands in the mirror. Everything downstream (product list, configurator, cart, checkout) is laid out as a ruled register, drawn like a technical sheet with dimension lines and arrowheads.

Density is moderate and mobile-first: big condensed caliber names, generous ruled rows, 44px+ touch targets everywhere. Depth is flat; structure comes from rules (hairlines and heavier ink lines), tonal paper steps, and the mirror field, never from shadows. The tone is precise and gift-worthy, never martial: no camouflage, stencil type, badges or military vocabulary.

**Scope.** This system applies only to the storefront: the default layout puts class `kb` on `<html>`, and every token is scoped to `html.kb` (light) and `html.kb[data-theme='dark']`. The admin (`layouts/admin.vue`) intentionally keeps the older shared print-shop tokens from `packages/config/tailwind/theme.css`, documented in the repo-level `docs/design-system.md`; it is not part of this system. Shared `Ps*` components inherit this world through the semantic variables they already read (`--surface`, `--brand`, `--text-primary`, `--radius-*`).

**Key Characteristics:**

- Card-stock paper ground, one flat black mirror field per view (hero target, gift band, mobile buy bar, footer).
- One hit colour, signal orange, for the primary action, the hit marker, active-nav underline, step numbers and focus.
- Archivo variable used across its width axis: condensed for caliber display, normal for text, wide for ring-number ticks.
- Tabular figures for every price, count and measurement.
- 2px corners; rules instead of cards; no shadows.

## Colors

A warm off-white card stock and near-black ink, with one hot orange that only ever means "the hit".

### Primary

- **Signal Hit** (#c2410c; dark #e2571e): the primary action button, the hit marker in the target and in selected caliber chips, the active-nav underline, ordinal step numbers, text selection, caret, accent-color and every focus ring. Text on it is white in light mode, ink (#121417) in dark mode.
- **Hit Wash** (rgba(194, 65, 12, 0.1)): soft tint behind hit-related states where a filled orange would shout.

### Secondary

- **Target Mirror** (#121417; dark #0b0c0e): the black centre of the target and the flat colour field that carries a view (hero target, gift section, mobile sticky buy bar, footer). Text on it is **Mirror Paper** (#f3f1ea) and secondary **Mirror Grey** (#a9aeb5); ring lines on it are on-mirror at 15-25% alpha. **Mirror Lift** (#1d2126) is the one tonal step inside the mirror.

### Neutral

- **Card Stock** (#f3f1ea; dark #16191d): page background.
- **Raised Stock** (#fbfaf6; dark #1e2227): inputs, the drawing figure on the product page, summary panels, the "how it works" band, the consent banner.
- **Sunk Stock** (#e8e5da; dark #101215): thumbnail wells, hover fill on line buttons and size tabs, quiet callout panels.
- **Ink** (#121417; dark #f1efe8): body text, heavy rules (top/bottom of registers), selected chips and tabs.
- **Ink Grey** (#4a4f57; dark #aab0b8): secondary text, meta lines, dimension lines, tick labels.
- **Ring Line** (#d3cec1; dark #30353c): 1px hairlines between rows and around panels.
- **Strong Ring** (#85806f; dark #737a84): borders of interactive controls at rest (inputs, chips, line buttons), scrollbar thumb.
- **Status**: OK green (#2f6b3f), warning amber (#8a5a00), error red (#b42318); dark mode lifts them to #7cc48f, #e0b34a, #ff8a7a. Error is used for invalid field borders and messages only.

### Named Rules

**The One Hit Rule.** Signal orange marks exactly one thing per region: the primary action, the hit, or the current position. Two filled orange buttons in one view is a defect; secondary actions are ink, line or quiet.

**The One Mirror Rule.** The black mirror is a flat field, never a card. A view carries at most one mirror field in its scroll band (plus the footer); content inside it uses on-mirror tones and its own translucent ring lines.

## Typography

**Display Font:** Archivo variable (wdth 62-125, wght 100-900), self-hosted, with ui-sans-serif / system-ui fallback
**Body Font:** Archivo at normal width
**Label/Mono Font:** Archivo at 112% width with tabular figures (no separate mono)

**Character:** One family stretched across its width axis does all the work: condensed and heavy for caliber names (the ring numbers of the target), normal for reading, wide and small for measurements. `font-synthesis: none`; fonts are self-hosted for DSGVO.

### Hierarchy

- **Display** (760, condensed 68%, line-height 0.92, -0.01em, balanced): page H1s at 3rem mobile / 4rem desktop; the home headline scales 3rem / 4.5rem / 5.75rem; product name 3.25rem / 4.5rem; caliber names in product rows 2rem / 2.75rem; the caliber inside the target fluid by container width; ordinal step numbers (in hit orange) 2-3.5rem.
- **Headline** (700, 82% width, line-height 1.05, -0.01em): section titles 2rem / 2.75rem; panel and empty-state titles 1.75rem; form-section and summary titles 1.5rem; cart line names and size-tab values 1.375rem; mobile menu entries 1.75rem.
- **Title** (700, normal width, 1.25rem): step titles in the "how it works" register.
- **Body** (400, 1rem, line-height 1.5): running text, capped at 34-46ch; lead paragraphs at 1.125rem in ink grey. Chips and primary CTAs set at 1.0625rem, 650-weight, slightly condensed (86-92%).
- **Label** (600, 0.875rem): form labels; hints and errors share the size (errors 600 in error red).
- **Tick** (600, 0.75rem, 112% width, 0.06em, uppercase, tabular): ring numbers on the target, dimension values on the box drawing, caliber-group row labels in the picker, footer column headings, order-number term.

### Named Rules

**The Width-Axis Rule.** Hierarchy is set with width as much as size: condensed means "a caliber or a title", wide means "a measurement". Do not introduce a second family.

**The Tabular Rule.** Every price, quantity, count, caliber number and dimension uses tabular figures.

## Layout

A single centred container (max 76rem) with 1rem gutters on mobile and 2rem from 768px. Sections breathe at 3.5rem vertical padding on mobile and 5rem on desktop (the gift mirror band 4rem / 6rem). The header is a sticky 64px bar with a 1px ring line below it.

Lists are **ruled registers**, not card grids: a heavy ink line opens and closes the list, 1px ring lines divide rows. A product row is a three-column grid (drawing thumbnail 4.5rem / 6.5rem, condensed caliber name, price with arrow) and the whole row is the link. The home "how it works" is a three-column register on desktop separated by vertical rules, stacked with a 3rem number column on mobile.

Home first viewport: on mobile the headline, then the target (max 15rem, 24rem from sm), then the grouped caliber picker and the full-width hit CTA. From md the headline, lead, picker and CTA sit in the left column and the target occupies a right column up to 34rem. Product, cart and checkout use a two-column layout from lg with a sticky right-hand panel (`top: 6rem`); on mobile, product and cart replace it with a fixed mirror buy bar at the bottom honouring the safe-area inset. Every interactive target is at least 44px; primary buttons and inputs are 48px.

## Elevation & Depth

The system is flat. There are no box-shadows anywhere in the storefront; depth comes from three paper tones (sunk, ground, raised), from rule weight (1px ring line versus 1px/2px ink line), and from the flat black mirror field. The only layering effects are the modal overlay scrim (rgba(18,20,23,0.55); dark rgba(0,0,0,0.7)) and the translucent sticky header (paper at 85-95%).

### Named Rules

**The Rule-Not-Shadow Rule.** Separate with a line or a paper step, never a shadow. A panel that needs to stand out gets Raised Stock plus a 1px ring outline; a section that needs weight gets a heavy ink rule.

## Shapes

Corners are nearly square (2px) on buttons, inputs, chips and the shared `Ps*` radius tokens (`--radius-card`, every `--radius-pill-*`); size tabs, quantity steppers and ruled panels are fully square. Circles belong to the target vocabulary only: the rings and hit of the target, the ring glyph inside caliber chips, and the round hit-orange cart count badge. Drawings use a technical-sheet grammar: 1-1.25px ink strokes, dimension lines with open arrowheads and paper-backed tick labels, and dashed outlines (5 4) for the alternative size.

## Components

### Buttons

Rectangular, decisive, with a 1px press-down on active.

- **Shape:** near-square (2px), min-height 48px, padding 0.75rem 1.25rem, 650 weight at 92% width, icon gap 0.5rem.
- **Hit (primary):** Signal Hit fill, on-hit text; hover mixes 12% ink into the orange. One per region.
- **Ink:** ink fill, paper text; hover mixes 15% paper in. Used for secondary-but-solid actions (empty-state reset, both consent choices with equal weight).
- **Line:** transparent with Strong Ring border; hover goes to ink border and Sunk Stock fill.
- **Quiet:** text with a Strong Ring underline, 44px tall; underline turns hit orange on hover. "See all", remove, edit.
- **Icon:** 44px square, no padding; used for cart, menu, close, share and wishlist.
- **Motion:** colours 160ms, transform 120ms, ease `cubic-bezier(0.22, 1, 0.36, 1)`. Disabled is 50% opacity with not-allowed cursor.

### Chips (caliber picker)

- **Style:** 44px tall, 2px corners, Strong Ring border, 650 weight at 86% width, 1.0625rem, tabular. Leading 16px ring glyph (two circles) at 70% opacity.
- **State:** hover darkens the border to ink; selected (native radio `:checked`) fills ink with paper text and drops a hit-orange dot into the ring glyph. Focus is a 2px hit outline offset 2px. A mirror tone inverts the scheme for use on black.
- **Structure:** a native radio fieldset, rows grouped by Kurzwaffe / Langwaffe / Randfeuer with a tick-style group label in a fixed left column.

### Cards / Containers

There are no cards. Containers are **ruled panels**:

- **Corner Style:** square.
- **Background:** Raised Stock for summary panels and the product drawing figure; Sunk Stock for quiet callouts and thumbnail wells.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px ring outline at rest; 1px ink border for emphasised containers (no-results box, size tabs); 2px ink top and bottom around the product purchase block.
- **Internal Padding:** 1.25rem mobile, 1.5rem desktop (summary); 1.5rem / 2rem (callouts).

### Inputs / Fields

- **Style:** 48px tall, 2px corners, 1px Strong Ring border, Raised Stock fill, 1rem text, padding 0.625rem 0.875rem. Selects draw their chevron from two CSS gradients. Label above (0.875rem, 600), hint and error below (0.875rem).
- **Focus:** border and 2px outline both turn hit orange (offset 0). Hover darkens the border to ink grey. Invalid fields get an error-red border.

### Navigation

Sticky 64px header on translucent paper with a bottom ring line: wordmark left, three links (600 weight, ink grey, ink when current) with a 2px hit underline sitting on the header rule for the current page, language menu and cart on the right. The cart count is a round hit badge. On mobile the menu is a full-height native `<dialog>` with headline-size ruled entries and trailing arrows, then language and theme switches. The footer is a mirror field with a condensed wordmark, tick-style column headings and 44px links.

### The Target (signature)

A square SVG: ten scoring rings (1px), a black mirror from ring 4 inward, tick-style ring numbers on the axes, crosshair ticks outside the card, and the caliber name in condensed display inside the mirror with the sizes as a tick sublabel. Changing caliber replays the shot: the hit flies in from the upper right (520ms, `cubic-bezier(0.16, 1, 0.3, 1)`), one hit-orange ring pulses outward, and the name swaps with a vertical clip-path reveal (260ms). Purely decorative (`aria-hidden`); the picker and CTA carry the meaning. Reduced motion swaps instantly.

### Box Drawing (signature)

A schematic two-view technical drawing of the box (top view with sockets, front view with the caliber name in the chosen label colour), filled live with the chosen box colour. Dimension lines with arrowheads label 10 columns and the row count. The sibling size (50 vs 100) is drawn as a dashed outline, and switching sizes animates the geometry (360ms) and staggers the sockets in. A compact variant (top view only) is the product-row thumbnail. It is illustrative and claims no real dimensions.

### Size Tabs and Buy Bar

Size choice is a two-cell ruled tab strip with a 1px ink border; the current size fills ink. On mobile, product and cart pages pin a mirror buy bar to the bottom with price and a hit button.

## Do's and Don'ts

### Do:

- **Do** scope every storefront rule to `html.kb` and read colours through the `--kb-*` tokens (or their Tailwind aliases `paper`, `ink`, `mirror`, `hit`, ...), so light and dark both work.
- **Do** build lists as ruled registers: heavy ink line top and bottom, 1px Ring Line between rows, whole row clickable.
- **Do** keep every touch target at least 44px and every primary button and input at 48px.
- **Do** show focus as a 2px Signal Hit outline (offset 3px globally, 2px on chips, 0 on inputs).
- **Do** use tabular figures for prices, counts and dimensions, and the Tick style for measurement labels.
- **Do** let motion describe the shot or the geometry (hit, ring pulse, size morph) and disable it under `prefers-reduced-motion`.

### Don't:

- **Don't** add box-shadows, decorative gradients or rounded cards; separate with rules and paper tones.
- **Don't** use Signal Hit for more than one action per region, or for decoration.
- **Don't** use a second typeface, stencil or slab type, or any military styling (camouflage, badges, martial wording).
- **Don't** show product photos or 3D renders that do not exist; the box drawing is the product image.
- **Don't** apply these tokens to the admin; it stays on the shared print-shop theme.
