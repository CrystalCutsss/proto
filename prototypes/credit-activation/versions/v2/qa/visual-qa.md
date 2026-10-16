# credit-activation v2 — visual QA

- Date: 2026-10-16. Build: `pnpm site:build` (fresh), served by `createSiteServer` (open preview, no auth),
  Chromium (Playwright 1.56.1), `reducedMotion: 'reduce'`, `deviceScaleFactor: 1`.
- Pages: `/p/credit-activation/v2/?shell=0&product=…&pledge=…&docs=…#/route`, viewport 375 wide. The height
  matches each reference's inner frame (812, 832, 915, 1014, 1069, 1159) so the whole content is in view. Extra
  375×812 shots: `*-812.png`.
- References: `design-input/figma/*`, scaled to 383 px wide where needed (`02-kn-options` ×1.140,
  `03-ok-review` ×1.052), 4 px frame cropped, saved to `qa/visual/ref/`. Diffs `qa/diff/<name>.png`
  (`pnpm qa:diff qa/visual/ref/<name>.png qa/visual/<name>.png`). Side-by-side images: `qa/visual/cmp-<name>.png`
  (reference | actual | diff). Raw numbers: `qa/visual/results.json`.
- Vertical positions below are y px (1x) of ink runs measured on the reference and on the screenshot.
- Fonts: SF Pro is missing. Text renders with the system Inter through `-apple-system`/`BlinkMacSystemFont`
  (CDP `getPlatformFontsForNode`: Inter / Inter-Bold / Inter-SemiBold, not custom). The bundled web fonts
  stay `unloaded` because nothing uses them. Glyph differences are ignored, as agreed.
- Console: no errors or warnings on any route or in the viewer. Network: no requests leave the site (no CDN).

## Diff ratios (pointer only, fallback font)

| reference | route / state | diff |
| --- | --- | --- |
| 01-kn-offer-auto | kn, auto, `#/` | 2.64 % |
| 01-kn-offer-realty | kn, realty, `#/` | 2.62 % |
| 01-ok-offer-two-pledges | ok, both, tap the realty card | 3.23 % |
| 02-kn-options | kn, pledge on → `#/options` | 8.94 % |
| 02c-ok-options | ok, pledge on → `#/options` | 5.56 % |
| 03-kn-review | kn, pledge auto + package → `#/review` | 3.86 % |
| 03-ok-review | ok, pledge auto → `#/review` | 5.69 % |
| 03b-review-no-options | ok, nothing on, `#/review` | 7.91 % |
| 04a-documents-one | `#/sts` | 10.00 % |
| 04b-documents-two | docs=two `#/documents` | 6.88 % |
| 04c-upload | docs=two `#/upload` | 9.91 % |
| 05-documents-ready | upload → «Загрузить» → documents | 6.89 % |
| 06-success | `#/success` | 0.76 % |

## Findings (ranked)

1. **`#/review` (no options), `#/sts`, `#/documents`, `#/upload`: the bottom block with legal text below is 16 px
   too short.** Button ref y 658–713, actual 674–729 (+16). Legal text lines ref at 734 / 749 (15 px pitch),
   actual 740 / 758 (18 px pitch). From the button's bottom to the top of the home indicator: ref 65 px,
   actual 49 px. These are the worst diff bands on 5 screens (y 640–736, up to 46 %). Evidence: `cmp-03b-*`,
   `cmp-04a-*`, `cmp-04b-*`, `cmp-04c-*`, `cmp-05-*`, `diff/04b-documents-two.png`. Fix: in `.legal` use the
   ui-s line height (`--ds-typography-ui-s-line-height` = 16 px) instead of `--ds-font-line-height-x4-5` (18).
   Make `.legal--below` about 64 px tall (now `min-height: space-12` = 48 with `margin-top: -12`), with the
   text centred in it.
2. **`#/options` and `#/review`: the large title sits 8 px too high.** First title line ink: ref y 111,
   actual 102–103. On `#/documents` and `#/sts` the title matches (107/107, 103/103), so `.large-title` needs
   `padding-top` 16 px instead of 8 on these two screens.
   - `#/review`: the cards are already where they should be (card title 242 in both), so with padding-top 16
     the bottom padding of `.large-title--review` must drop from 28 to 20 px. The gap from subtitle to card is
     now 8 px too large (ref 185→242, actual 177→242).
   - `#/options`: the first card is 16 px too high (radio ref 221, actual 205 in `02c`). After padding-top
     16 it still needs 8 px more gap between the title and the first card.
   Evidence: `cmp-02c-ok-options.png`, `cmp-03-kn-review.png`.
3. **Card-large (pledge cards on `#/`, option cards on `#/options`): the description sits 4 px low, so each card
   is 4 px too tall.** Description ink ref 456–469, actual 460–473. Badges ref 485–512, actual 489–516. With two
   pledges (`01-ok`) this adds up to +8 px: the content is 923 px tall in a 915 px frame. `02c`: card 2 is −12
   instead of −16, card 3 is −8 (the cumulative +4 per card). Computed: header 52 px (16 + title 24 + 12),
   description 17/20. Fix: header bottom padding 8 px (`--ds-space-2`) instead of 12. Evidence:
   `cmp-01-ok-offer-two-pledges.png`, `diff/01-kn-offer-auto.png` (band y 448–512).
4. **`#/` ОК, slider at 7 000 000 ₽: the knob is about 46 px left of the design.** Actual knob centre x≈220
   (60 % of the track, linear 4–9 млн). The design draws it at x≈266, on the 4th tick (75 %). The ticks match
   (x≈104/187/269/349). Either the design is not linear or it is inaccurate: needs an owner decision, no code
   change is implied. Evidence: `cmp-01-ok-offer-two-pledges.png`, diff band y 247–267.
5. **`#/options` КН: the payment chip is green (positive) with the package on; the design (`02-kn-options`,
   package checked) shows it neutral (white, dark icon).** This follows the spec rule («payment chip КН positive
   while the package is on»), which contradicts this frame. Confirm with the owner, or check whether another
   frame shows the green chip. Evidence: `cmp-02-kn-options.png`, band y 1024–1056 (27 %).
6. **`#/options` КН, package card content.**
   - The check icon is top-aligned and smaller: ink 9 px at the first line (y 254–262, row 1). The design has an
     11 px glyph centred on the 2-line row (282–292).
   - The text column is wider than in the design. The design wraps «Бесплатное обслуживание / счета для
     бизнеса»; the actual page fits «…обслуживание счета» on one line, even though the fallback font is wider.
     The design text box ends at about x 300–320 px; the actual one ends at x 339.
   - Gaps are about 5–7 px smaller: title row to first check row 46 → 41, last row to «Изменить пакет» 58 → 51
     (reference rescaled ×1.14, ±1 px).
   Fix: centre the check vertically (`align-items: center`) and check the 16 px icon box/glyph size. Add
   right padding (about 24–40 px) to `.check-rows` and re-read the row geometry in Figma
   (42:2979). Evidence: `cmp-02-kn-options.png`, `02-kn-options-812.png`.
7. **`#/review`: rows are 4–5 px shorter than in the design.**
   - «Сумма и платеж» rows: pitch ref 61 px (caption 285 → 346), actual 56 (287 → 343). Caption-to-value
     spacing (ink top to ink top): ref 20, actual 16.
   - «Залог и условия» avatar rows: pitch ref 60 (542/602/662), actual 56 (542/598).
   - Computed `.row` is `min-height: 56px`, caption 13/16, value 17/20. In the design rows are about 60 px (value
     line height 24, or 10 px vertical padding).
   Fix: value line height `--ds-typography-body-l-line-height` (24) or `.row` min-height 60.
   Evidence: `cmp-03-kn-review.png`, `cmp-03-ok-review.png`.
8. **`#/options` panel: 3 px taller and chips 2 px taller.** Divider ref y 680, actual 677. Chips ref ≈30 px
   (696–725), actual 32 (694–725, as the spec says). The button position matches (742–797). Minor. Evidence:
   `cmp-02c-ok-options.png`.
9. **`#/` with two pledges at 812 px: no fade above «Дальше».** The content overflows by about 110 px, and the
   second card is cut sharply at y 722 (`01-ok-offer-two-pledges-812.png`, also visible in the viewer). The
   spec allows dropping the fade only when the content is short. Fix: use `bottom-block--fade` on the offer
   (or only when it overflows). Minor.
10. **`#/documents` cards: 2–3 px shorter.** Card 1 ref 130, actual 128; card 2 ref 148, actual 145. Badge
    «Загрузить/Загружено» ref ≈30 px tall (240–269), actual 28. Minor.
11. **Yellow button states.**
    - Normal `#ffdd2d`, hover `#ffcd33`, pressed `#ffcd33` + `scale(0.98)` (matches `:active`, width 343 →
      336.1), focus-visible 2 px ring `--ds-border-focus`.
    - Hover and pressed have the same colour (the iOS hover token is null; this is a documented ledger
      decision), so only the scale tells them apart. Under `prefers-reduced-motion` the scale is removed, which
      makes hover and pressed identical.
    - Evidence: `state-button-hover.png`, `state-button-pressed-no-preference.png`,
      `state-button-pressed-reduce.png`, `state-button-focus.png`. Acceptable; flag to the owner.
12. **Data, not layout (expected / known):**
    - The offer payment shows 10 215 ₽ / 17 713 ₽ instead of 193 500 ₽ (owner chose the formula).
    - `03b` is drawn at 7 000 000 ₽ with no «Комиссия» row (a КН-style frame). ОК with nothing on renders
      4 000 000 ₽ with «Комиссия 2,9%», so the screen is 56 px taller in the top card and the rest shifts.
    - Success shows the current total (4 000 000) instead of 8 000 000.
    - `#/sts` and `#/upload`: the title wraps to 3 lines in the fallback font (2 in Figma), which pushes the
      content 36 px down (known).
    - The review «Залог и условия» lists only what is selected (known).

## Matches

- Status bar, app bar, «Закрыть» / back chevron positions (y 59–75 on every screen).
- Offer header, amount, slider track, ticks, labels.
- Info cards (y 332–365 / 332–368), pledge card title row, radio, «?» and green badges.
- Fee «2,9% → 2,5%».
- `#/documents` title and card layout (±3 px), «Загружено» state after upload.
- `#/success` (0.76 %).
- The «Дальше» button on the offer, options and review (button y matches to the pixel).

## Viewer, 1440×1000 (`/p/credit-activation/?v=v2`)

- iPhone mockup on a black stage. The glow is gone: `.viewer[data-mode='device'].ds-stage::before { content:
  none }`, so the pseudo-element with `stage-glow.webp` is not generated.
- The menu has three captioned segmented controls «Сценарий / Залог / Документы» (КН|ОК, Авто|Недвижимость|2
  залога, 1 док|2 дока). There are no version or screen menus.
- Switching to ОК / 2 залога / 2 дока reloads the iframe with `?product=ok&pledge=both&docs=two`.
- No console errors, no external requests. Evidence: `viewer-1440.png`, `viewer-1440-ok-both-two.png`,
  `viewer-1440-button-hover.png`.

## Verdict

**minor differences.** Nothing is structurally wrong, but four systematic spacing issues are worth fixing before
review: items 1–3 and 7, which are 4–16 px offsets. Items 4 and 5 are design or spec conflicts for the owner.
