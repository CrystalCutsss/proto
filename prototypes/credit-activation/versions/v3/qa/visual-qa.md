# credit-activation v3 — visual QA

- Date: 2026-10-20. Build: `pnpm site:build` (fresh), served by `createSiteServer` (open preview, no auth),
  Chromium (Playwright 1.56.1), `reducedMotion: 'reduce'`, `deviceScaleFactor: 1`.
- Pages: `/p/credit-activation/v3/?shell=0#/route`, design bars shown, viewport 375 wide. Height = the reference's
  inner frame (812; `#/review` 1012; `#/light` 1028) so the whole screen is in view; extra 375×812 shots
  `*-812.png` for the two tall screens.
- States: `#/heavy` pledge card tapped; `#/review` reached through the flow (`#/heavy`, pledge + statement on,
  «Дальше») because the reference shows three rows (a deep link to `#/review` shows only the package row);
  `#/light` deep link (package on by default) + «До −0,5%» card tapped.
- References: `design-input/figma/*`, 4 px frame cropped (`qa/visual/ref/`). Diffs:
  `pnpm qa:diff design-input/figma/<n>.png qa/visual/<n>.png --crop-ref 4 --out qa/diff/<n>.png`.
  Side-by-side (reference | actual | diff): `qa/visual/cmp-<n>.png`.
- Vertical positions below are y px (1x) of ink runs measured on the reference and the screenshot (pngjs scan),
  plus DOM boxes from `getBoundingClientRect`.
- Fonts: SF Pro is not available on Linux; text renders with the system fallback (all bundled `@font-face`
  entries stay `unloaded`, nothing uses them). Glyph widths differ; ignored as agreed.
- Console: no errors or warnings on any route or in the viewer. Network: no request leaves the site (no CDN).

## Diff ratios (pointer only, fallback font)

| reference     | state                        | diff   | worst bands               |
| ------------- | ---------------------------- | ------ | ------------------------- |
| 01-conditions | `#/`                         | 2.16 % | 160–224 (amount glyphs)   |
| 02-heavy      | pledge on                    | 4.21 % | 512–544, 384–416          |
| 03-review     | pledge + statement + package | 3.79 % | 608–640, 672–704, 832–864 |
| 04-documents  | `#/documents`                | 2.56 % | 96–128 (title glyphs)     |
| 05-upload     | `#/upload`                   | 5.89 % | 320–384, 128–160          |
| 06-light      | package + «До −0,5%»         | 3.61 % | 576–608, 736–768          |
| 07-success    | `#/success`                  | 0.76 % | 448–480 (amount text)     |

The 800–812 / 992–1012 / 1024–1028 bands are the reference's rounded device-frame corners, not the UI.

## Findings

1. `#/heavy`, `#/light` — title → description gap on option cards is 4 px larger than drawn, so each card is
   4 px taller and the drift accumulates down the list — evidence `qa/visual/cmp-02-heavy.png`,
   `qa/visual/cmp-06-light.png`, `qa/diff/02-heavy.png`. Cap tops title → description: ref 221 → 251 (30 px),
   actual 220 → 255 (35 px). Card height ref 128 px, actual 132 px (DOM 200–332). Card 2 title ref 365, actual
   368; card 3 title ref 513, actual 520; card 3 description ref 543, actual 555 (+12). `#/light` fee cards: ref
   description 579 vs actual 583, card 3 description 747 vs 755; card height 148 → 152. — Suggested fix:
   `.card-large__description { padding-top: 0 }` (header's 8 px only). Note: the 12 px gap was an owner decision
   on 2026-10-16 (v2, comment in `style.css`); the v3 frames draw 8 px, so the owner must choose.
2. `#/review` — «Сумма и платеж» card is 8 px taller: the gap from the last value row to «График платежей» is
   22 px instead of 14 — evidence `qa/visual/cmp-03-review.png`. Button ref y 398–441, actual 406–449; value ink
   bottom 380 in both. Card ref 222–462 (240 px), actual 222–470 (248 px). Everything below shifts +8.
   — Suggested fix: `.card__footer` padding-top `--ds-space-1` (4 px) instead of `--ds-space-3` (12) for this
   card (check the «Залог и условия» footer separately, see 3).
3. `#/review` — «Залог и условия» rows: the subtitle sits 4 px closer to the title than drawn, and the row block
   starts 3 px lower — evidence `qa/visual/cmp-03-review.png`. Cap tops title → subtitle: ref 545 → 570 (25 px),
   actual 557 → 578 (21 px); the row title is `t-body-l` 17/20 (DOM 20 px tall), the design's text block is 40 px
   (= avatar). First avatar top − card top: ref 60, actual 63. Card ref 482–786 (304 px), actual 490–798 (308);
   «Рублевый счет» title ref 826, actual 838 (+12 total). — Suggested fix: row title line height 24 px
   (`--ds-typography-body-l-line-height`, as `.row__value` already does) or a 4 px gap between title and
   subtitle, and align the avatar row so the block starts at title bottom + 8 (`card__title` 52 px).
4. `#/heavy`, `#/light` — checked cards show green badges (`.card-large.is-on .badge`), the frames show neutral
   badges on checked cards («+3 000 000 ₽», «−0,5%» on `#/heavy`; «До −0,5%» on `#/light`) — evidence
   `qa/visual/cmp-02-heavy.png` y 284–312, `qa/visual/cmp-06-light.png` y 804–832. Spec Q5 deliberately keeps the
   v2 behaviour; listed so the owner confirms. — Fix if the owner wants the drawing: drop `.card-large.is-on
.badge` from the positive rule.
5. `#/upload` — title wraps to three lines («деньги» alone), the bullets wrap differently and everything below
   moves 36 px down (sample row ref 328–358, actual 364–395; «Выберите файлы» ref 384–439, actual 424–481) —
   evidence `qa/visual/cmp-05-upload.png`. Cause: fallback font is wider than SF Pro (same in v2,
   `versions/v2/qa/visual/cmp-04c-upload.png`). Not a CSS defect; check on an Apple device. No fix proposed.
6. `#/light` (scrolled, 375×812) — the top bars are transparent, so card text shows behind the status bar and
   «Закрыть» when the list is scrolled — evidence `qa/visual/06-light-812.png` y 0–80. Not drawn in the design
   (no scrolled frame); observation only.

Matching within ≤ 2 px (glyph noise only): `#/` (all blocks; payment 10 122 ₽ is the accepted live value),
`#/documents` (title 113/112, cards, badges 245–264 in both, button 658–713 in both, legal 734/750 in both),
`#/success` (illustration, text 447/446, button 547/547), `#/heavy` and `#/light` bottom panels (chips 676/676,
892, button 722–777 / 938), `#/light` package card (title 221/220, rows 268/267, 323/323, «Изменить пакет»
444–487 in both). Colours of buttons (#FFDD2D), secondary buttons (#F7F7F8), avatars (#E1ECFE) match.
Accepted: live numbers (`#/` payment, `#/light` chips 10 122 ₽ / 2,4 %, success amount), `#/upload` label
«Загрузить».

## Fix round 1 (2026-10-20)

Fresh `pnpm site:build`, same states and scripts as above; re-shot `#/heavy`, `#/review` (+ `-812`, flow
state), `#/light` (+ `-812`), `02-heavy-pledge-statement.png`; `qa/diff/0{2,3,6}-*.png` and `cmp-*` regenerated.

- Finding 1 fixed: `.card-large__description` padding-top 0 (title → description 8 px, the header's own).
  `#/heavy` card height 132 → 128 px (DOM 200–328, 344–472, 492–620); cap tops title → description ref 221 → 251,
  actual 220 → 251 (was 255); card 2 title ref 365 / actual 364 (was 368); card 3 title ref 513 / 512 (was 520),
  description ref 544 / 544 (was 555). `#/light` fee cards 152 → 148 px (DOM 528–676, 696–844); descriptions ref
  579 / 579 (was 583) and 747 / 747 (was 755).
- Finding 2 fixed: `.card__footer` padding-top `--ds-space-1` (4 px). «Сумма и платеж» 248 → 240 px (DOM
  222–462, ref 222–462); «График платежей» button 406 → 398 (ref 398).
- Finding 3 fixed: «Залог и условия» rows are 56 px cells 4 px apart (`.card__rows` gap `--ds-space-1`, 8 px
  under the last), avatar margin 8 px, title → subtitle gap 4 px (text block 20 + 4 + 16 = 40 px = avatar). Card
  308 → 304 px (DOM 482–786, ref 482–786); avatar top − card top 63 → 60 (ref 60); cap tops title → subtitle ref
  545 → 570, actual 545 → 570 (was 557 → 578); «Рублевый счет» title ref 826 / actual 826 (was 838).
- Finding 4 unchanged (v2 behaviour, owner Q5).
- Diff ratios now: 02-heavy 4.21 → 3.03 %, 03-review 3.79 → 2.14 %, 06-light 3.61 → 2.73 % (remaining bands:
  title glyphs and the device-frame corners).
- Console: no errors or warnings; no external requests.

## Viewer (1440×1000)

- `/p/credit-activation/?v=v3` → `qa/visual/viewer-v3-menu.png`: «Сценарий» (КН / ОК), «Залог» (Авто /
  Недвижимость / 2 залога), «Документы» (1 док / 2 дока) greyed out — label brightness 141 vs 231 in v2, the
  selected pill #3C3C3C vs #525252; the controls are `disabled`; clicking «ОК» leaves the URL unchanged.
  «Версия» v1 / v2 / v3 is active (v3 selected); clicking v2 switches to v2. The v3 URL carries
  `s=main&product=kn&pledge=auto&docs=one` (ignored by v3, kept for switching back).
- `/p/credit-activation/?v=v2` → `qa/visual/viewer-v2-menu.png`: the same axes active, v2 selected.
- Note: the greyed product axis is captioned «Сценарий» (v2 axis title), and v3 has no `scenarios` of its own
  (the spec suggested «Тяжелые условия» / «Сразу легкие»), so on v3 the only «Сценарий» on screen is a disabled
  v2 control.

## Verdict

minor differences
