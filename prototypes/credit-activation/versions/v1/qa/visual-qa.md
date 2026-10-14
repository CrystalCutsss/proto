# Visual QA — credit-activation v1

- Date: 2026-10-14
- Build: `dist/site` as provided (not rebuilt), served by `createSiteServer` (auth off), URL
  `/p/credit-activation/v1/?shell=0#…`
- Browser: Chromium (Playwright 1.56.1), `reducedMotion: 'reduce'`, deviceScaleFactor 1, `document.fonts.ready`
- Viewports: 375×812 (all routes), 1440×900 (`#/`, device frame)
- Routes: `#/`, `#/conditions`, `#/review`, `#/documents`, `#/success` (deep links; screenshots taken once the
  top `.page` is the target, not inert, and no `.viewport.is-busy`)
- References: `design-input/figma/0N-*.png`, `--crop-ref 4`

## Diff ratios (pointer only: text renders in the fallback font)

| Route | Diff (top-aligned) | Extra diff | Diff image |
|---|---|---|---|
| `#/` | 12.99 % | bottom-aligned 8.01 %; scrolled-to-end vs bottom-aligned ref 8.78 % | `qa/diff/01-offer*.png` |
| `#/conditions` | 14.06 % | bottom-aligned 9.82 % | `qa/diff/02-conditions*.png` |
| `#/review` | 10.86 % | scrolled-to-end vs ref bottom (offset 180) 3.36 % | `qa/diff/03-review*.png` |
| `#/documents` | 6.65 % | — | `qa/diff/04-documents.png` |
| `#/success` | 3.59 % | — | `qa/diff/05-success.png` |

The worst bands of the top-aligned 01/02/03 diffs (y 704–812) come from the reference frames being taller than
812 px (the bottom block sits lower in Figma); bottom-aligned diffs remove them.

## Fonts, console, network

- Text uses the `SF Pro, -apple-system, …` stack. In this Linux environment Chromium resolved it to the
  system-installed Inter (`CSS.getPlatformFontsForNode`: Inter / Inter-SemiBold / Inter-Bold, not custom); no
  `@font-face` was needed, so every `document.fonts` entry reports `unloaded`. Expected (SF Pro is not embedded).
- Console: no errors or warnings, no page errors. Network: no requests outside the site, no 4xx/5xx.

## Verified OK

- Sticky bottom block on `#/` and `#/review`: after scrolling to the end, the last content block ends exactly
  32 px above the bottom block (`#/`: options card bottom 690, block top 722; `#/review`: cards bottom 642,
  legal/block top 674; `.content` padding-bottom 32 px). Shots `qa/visual/01-offer-bottom.png`,
  `qa/visual/03-review-bottom.png`.
- Bottom block geometry matches Figma: button 56 px tall, legal→button 16 px, button→home indicator 21–23 px,
  indicator 5 px, 8 px below it (`#/`, `#/review`, `#/documents`).
- Top block (status bar, app bar, «Закрыть»/back) lines up to the pixel with the references; the top bar is
  sticky with translucent white + blur when content scrolls under it.
- `#/review` cards 1–2 heights (240 px), rows, avatars, secondary buttons match.
- `#/documents` bottom block, file field, disclosure row match (offset only by the title wrap, see below).
- States: pressed primary button `#ffcd33` + scale 0.98 (`01-offer-button-pressed.png`); switch toggles to
  green (`01-offer-switch-toggled.png`); plan 2 selection moves the radio check (`02-conditions-plan2.png`,
  aria-checked `[false,true,false]`).
- 1440×900: device 375×812 centred at x 532.5, y 44 with shadow on a light background (`desktop-01-offer.png`).

## Findings

1. **`#/` (all screens with the yellow button) — primary button disappears on hover.** Under
   `[data-ds-platform="ios"]` `--ds-appearance-primary-background-hover` resolves to `--ds-color-null-null`
   (`#0000`), so `.button--primary:hover` makes the button transparent; only the label stays.
   Evidence: `qa/visual/01-offer-button-hover.png`, `qa/visual/04-documents-button-hover.png`; computed
   background normal `rgb(255,221,45)`, hover `rgba(0,0,0,0)` (also on `#/success`).
   Fix: do not use the iOS hover token for desktop hover; e.g. keep `--ds-appearance-primary-background-normal`
   on hover, or use the day accent hover value from the base theme (`--ds-color-yellow-yellow-darker-60` via a
   semantic token), or drop the primary hover rule on iOS.
2. **`#/success` — 24 px gap image→title and 8 px gap title→text are missing.** `.content h1, .content p
   { margin: 0 }` (specificity 0,1,1) overrides `.status__title { margin-top }` / `.status__text { margin-top }`
   (0,1,0). Computed: image 305–433, title top 433, text top 453. Figma: illustration→title ≈ 46 px, ours 21 px
   (glyph rows); title→text 27 vs 21 px.
   Evidence: `qa/visual/05-success.png`, `qa/diff/05-success.png` (doubled title/text lines).
   Fix: raise specificity (`.status .status__title`, `.status .status__text`) or use `gap` on `.status`.
3. **`#/` — info-card chevron is about 1.5× too large.** `.info-card__chevron` has 4 px padding with
   `box-sizing: content-box`; the mask is positioned over the border box (default `mask-origin`), so the
   16 px icon is painted at 24 px (glyph ≈ 11×18 instead of 7×12).
   Evidence: `qa/visual/01-offer.png` vs ref (cards «Срок», «Платеж в месяц»); `qa/diff/01-offer.png`.
   Fix: add `mask-origin: content-box; mask-clip: content-box;` to `.info-card__chevron` (or to `.mask`).
4. **`#/` — info cards 8 px shorter than Figma (64 vs 72 px).** Text block identical (31 px), Figma vertical
   padding ≈ 16 px vs 12 px here. Accumulates with item 5: the options card starts 14 px higher.
   Evidence: `qa/visual/01-offer.png`, `qa/diff/01-offer.png` (doubled «Платеж в месяц»).
   Fix: padding `var(--ds-space-4) var(--ds-space-4) var(--ds-space-4) var(--ds-space-3)` after checking the
   Figma node (spec says 12 px; the render says 16).
5. **`#/` — option rows 56 px vs 60 px in Figma; title→description 21 vs 24 px.** Options card 236 vs ≈ 254 px;
   scroll height 841 vs 879 px in Figma.
   Evidence: `qa/visual/01-offer-bottom.png`, `qa/diff/01-offer-bottom-aligned.png`.
   Fix: check the Figma row/title line height (likely 2–4 px gap or a 22–24 px line height) and adjust
   `.option` / `.option__title`.
6. **`#/conditions` — plan cards 30 px taller (288 vs 258 px).** Row text uses body-l 17/24 (two-line pitch
   24 px), Figma pitch is 20 px; rows here 64 px vs ≈ 56–60 px. Header: Figma title glyph sits 7 px lower and
   title→subtitle is 32 vs 27 px. Same 24 vs 20 px line pitch on `#/documents` bullets.
   Evidence: `qa/visual/02-conditions.png`, `qa/diff/02-conditions.png` (rows drift down the card).
   Fix: verify the text style of plan rows and bullets in Figma (render implies a 20 px line height, e.g.
   body-m/20 or body-l with lh 20) and the plan header spacing; update tokens used accordingly.
7. **`#/review` — header and account card spacing.** Large title starts 9 px lower in Figma (glyph 112 vs 103);
   first card 12 px lower (222 vs 210). «Рублевый счет» card: title→subtitle 32 vs 24 px, card 80 vs 72 px.
   Evidence: `qa/visual/03-review.png`, `qa/visual/03-review-bottom.png`, `qa/diff/03-review.png`.
   Fix: compare `.large-title--review` padding-top (8 px now) and `.card--account` header/subtitle spacing with
   the Figma node.
8. **`#/` — slider thumb position (minor).** Thumb centre ≈ x 283 (80 % of the track, correct for 8 M in
   4–9 M); Figma draws it at ≈ 73 %. Probably a Figma approximation; leave unless the designer confirms.
   Evidence: `qa/diff/01-offer.png` (y 247–258).
9. **`#/documents` — title wraps to three lines (font noise).** «Нужны фото СТС, чтобы получить деньги» is wider
   in Inter than in SF Pro, so everything below moves down 36 px; the legal link «с условиями» wraps
   differently. Not a defect of the build; verify on a Mac with SF Pro.
   Evidence: `qa/visual/04-documents.png`.
10. **1440×900 — device frame at a half-pixel x (532.5) (minor).** Can soften text/edges on some displays.
    Evidence: `qa/visual/desktop-01-offer.png`. Fix: round the horizontal offset (e.g. `left: 50%` +
    `translateX(-50%)` → grid/flex centring, or `margin-inline: auto` on an even-width container).

## Verdict

**does not match** — the overall layout, colours, icons, radii, shadows and sticky behaviour are close, but the
primary button vanishes on hover (1), the success screen misses its vertical gaps (2), the info-card chevron is
oversized (3), and several vertical spacings deviate from Figma by 8–30 px (4–7). All fixes are small and local
to `src/style.css`.
