# credit-activation v4 — visual QA (2026-10-25, re-shot after the owner's review)

Chromium 375 × 812, `?shell=0`, compared with `design-input/figma/*` cropped by the 4 px device border
(`pnpm qa:diff <ref> <shot> --crop-ref 4`). Screenshots in `visual/`, diffs in `diff/`.

| Screen                    | Different pixels | Main bands                                    |
| ------------------------- | ---------------- | --------------------------------------------- |
| `01-credit-kn`            | 2,47 %           | amount glyphs (system font instead of SF Pro) |
| `01-credit-ok`            | 2,72 %           | amount glyphs; «Комиссия» 2,5 % vs 2,9 % (Q9) |
| `02-conditions` (ОК)      | 3,60 %           | amount, chips text                            |
| `02b-conditions-selected` | 4,09 %           | chips (values follow the calc, Q1), text      |
| `06-tariffs`              | 4,01 %           | title and card text                           |

Positions match the metadata: title y 110, amount y 170 / 106, hint y 227, info cards y 307, pledge card y 399
(«Кредит»); chips y 175 (+2), first card y 231 («Условия»).

Motion checked frame by frame: the amount moves between the two positions, both screens' content cross-fades, the
status bar and «Дальше» stay; back (chevron and edge swipe) reverses it. The wheel tilts and shrinks the cards at
both edges under the gradients.

After the owner's review: the hint tail is visible again (its mask had the fill's 3 % alpha), the «+» of «Залог авто»
sits 16 px above the card's bottom as drawn, the back chevron's glyph is 1.5 px left of the circle's centre as in
the app bar instance. `02b-conditions-selected` and `06-tariffs` were not re-shot (unchanged apart from texts).
