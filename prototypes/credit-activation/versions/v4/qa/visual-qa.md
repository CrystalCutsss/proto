# credit-activation v4 — visual QA (2026-10-25)

Chromium 375 × 812, `?shell=0`, compared with `design-input/figma/*` cropped by the 4 px device border
(`pnpm qa:diff <ref> <shot> --crop-ref 4`). Screenshots in `visual/`, diffs in `diff/`.

| Screen                    | Different pixels | Main bands                                    |
| ------------------------- | ---------------- | --------------------------------------------- |
| `01-credit`               | 2,49 %           | amount glyphs (system font instead of SF Pro) |
| `02-conditions`           | 4,14 %           | amount, chips text                            |
| `02b-conditions-selected` | 4,09 %           | chips (values follow the calc, Q1), text      |
| `06-tariffs`              | 4,01 %           | title and card text                           |

Positions match the metadata: title y 110, amount y 170 / 106, hint y 227, info cards y 307, pledge card y 399
(«Кредит»); chips y 175 (+2), first card y 231 («Условия»).

Motion checked frame by frame: the amount moves between the two positions, both screens' content cross-fades, the
status bar and «Дальше» stay; back (chevron and edge swipe) reverses it. The wheel tilts and shrinks the cards at
both edges under the gradients.
