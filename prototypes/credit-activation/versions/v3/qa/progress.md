# credit-activation v3 — progress ledger

Task: new version «Тяжелые и легкие условия» of «Единая активация» from Figma «Plauground»
(`FyEnitMAmvWmNU9At6rjc4`, section «V4» `60:3874`, 7 screens): «Условия» → «Тяжелые» → «Проверка условий» →
«Загрузите документы» ⇄ «Нужны фото СТС» → «Легкие» → «Успех»; «Условия» «Дальше» goes straight to «Легкие».
Spec: `spec/spec.md`. Base: v2 (`pnpm proto:version credit-activation`).

Owner decisions (brief, 2026-10-20):

- Live calculations reusing the v2 `calc.ts` logic (amount, payment, fee, chip tones).
- No menu axes in v3: no product (КН / ОК), pledge or documents variants; one fixed scenario.
- `#/documents` always has two documents (Фото СТС авто, Гарантийное письмо); «Загрузить» → `#/upload` → back marked
  «Загружено» (v2 two-docs flow); «Получить деньги» → `#/light`.
- `#/success` shows the final total; «К счету» resets to `#/`.

## Steps

| Step             | Status  | Notes                                                                   |
| ---------------- | ------- | ----------------------------------------------------------------------- |
| 0. Prepare       | done    | `pnpm proto:version credit-activation` (base v2)                        |
| 0b. Figma intake | done    | references in `design-input/figma/`, new `assets/icons/plus-circle.svg` |
| 1. Spec          | done    | `spec/spec.md` (v2 spec replaced)                                       |
| 2. Build         | pending | prototype-builder                                                       |
| 3. Review        | pending | code-reviewer                                                           |
| 4. Visual QA     | pending | against `design-input/figma/0[1-7]-*.png`, crop the 4 px device border  |
| 5. Finish        | pending |                                                                         |

## v3 Figma intake

Date 2026-10-20, read-only (Figma MCP: `get_metadata`, `get_screenshot`, `get_design_context` only; asset URLs from
the design-context responses were fetched with curl and none are referenced anywhere in the version).

Figma calls (16 of the ~25 budget):

| #   | Tool                 | Node      | Result                                                            |
| --- | -------------------- | --------- | ----------------------------------------------------------------- |
| 1   | `get_metadata`       | `60:3874` | section «V4»: 7 frames, sizes, order by x                         |
| 2   | `get_screenshot`     | `60:3874` | `00-flow.png` (2048 × 840)                                        |
| 3   | `get_screenshot`     | `60:3875` | `01-conditions.png` (383 × 820)                                   |
| 4   | `get_screenshot`     | `60:3905` | `02-heavy.png` (383 × 820)                                        |
| 5   | `get_screenshot`     | `60:4042` | `03-review.png` (383 × 1020)                                      |
| 6   | `get_screenshot`     | `60:4010` | `04-documents.png` (383 × 820)                                    |
| 7   | `get_screenshot`     | `60:4022` | `05-upload.png` (383 × 820)                                       |
| 8   | `get_screenshot`     | `60:3965` | `06-light.png` (383 × 1036)                                       |
| 9   | `get_screenshot`     | `60:4038` | `07-success.png` (383 × 820)                                      |
| 10  | `get_design_context` | `60:3875` | «Условия»; `plus-circle` icon (new)                               |
| 11  | `get_design_context` | `60:3905` | «Тяжелые»; checkbox = v2 radio-selected/normal + check-ios        |
| 12  | `get_design_context` | `60:4042` | «Проверка условий»; avatars = v2 icons                            |
| 13  | `get_design_context` | `60:4010` | «Несколько документов»; = v2 `#/documents`                        |
| 14  | `get_design_context` | `60:4022` | «Загрузка документов»; = v2 `#/upload`, button label differs      |
| 15  | `get_design_context` | `60:3965` | «Легкие»; package card + 2 × «Снизим комиссию»                    |
| 16  | `get_design_context` | `60:4038` | «Успех»; illustration SVG export is a magnifier (wrong), not used |

Findings:

- All frames are rendered with a 4 px black device border and 40 px radius (383 px wide): not UI.
- Instance overrides came back as defaults; texts in the spec are read from the screenshots.
- Only new asset: `plus-circle.svg` (24 px, white disc with the plus cut out; checked rendered in Chromium on the
  accent-2 avatar). Checkbox, check-ios, percent and arrow glyphs have the same paths as the v2 set; the ₽ chip glyph came back as
  the instance default (a plus), so keep v2 `currency-rub.svg`. The success
  illustration export is a magnifier: keep v2 `coins-check.png`.
- `04-documents.png`, `07-success.png` differ from v2 `04b-documents-two.png`, `06-success.png` by the same 1720 px
  (AE, fuzz 3 %: shared status-bar/frame chrome), `05-upload.png` from v2 `04c-upload.png` by 2662 px — the extra is
  the button label «Получить деньги» instead of «Загрузить».

## Open questions for the owner

Defaults the builder follows until answered are in `spec/spec.md`.

- **Q1** `#/` «Платеж в месяц» is drawn 193 500 ₽ for 4 000 000 ₽, but the v2 formula (17 713,05 ₽ per 7 млн, used
  by `#/heavy` and `#/review`) gives 10 121,74 ₽ at 4 млн. Show the formula value (consistent, default) or the drawn
  193 500 ₽ as a static number?
- **Q2** Payment chip tone: neutral on `#/heavy`, positive on `#/light` (both with the package on by default).
  Default: positive only on `#/light` while the package is on.
- **Q3** The two «Снизим комиссию» cards (−1% and «До −0,5%», same description) — alternatives (mutually exclusive,
  default) or independent options? Is one of them a leftover variant?
- **Q4** Back from `#/light` reached directly from `#/` («Дальше») returns to `#/`; deep link `#/light` builds the
  long path through the documents. OK?
- **Q5** `#/heavy` draws the checked pledge card with neutral badges; v2 turned a checked card's badges green.
  Default: keep v2 (green when checked).
- **Q6** Drawn states (pledge on; package + «До −0,5%» on) are visual-QA states; defaults are all off except the
  package. Should `#/light` open with «До −0,5%» pre-selected?
- **Q7** `#/heavy` card gaps are 16 / 16 / 20 px in Figma (third card instance has pt 20). Keep as drawn or unify?
- **Q8** Fee on `#/review`: the design has no «Комиссия» row although the fee changes on `#/heavy` / `#/light`
  (and `#/light` comes after the review). Default: no row, as drawn.
- **Q9** `#/heavy` «Дальше» with nothing selected: still → `#/review` (only the package row, default) or disabled?
- **Q10** Documents always «Фото СТС авто» + «Гарантийное письмо», even without the pledge on `#/heavy`. OK?
- **Q11** `#/documents` «Получить деньги» → `#/light` immediately, or only after «Загружено» (v2 pushed `#/upload`
  when not ready)? Default: always `#/light`.
- **Q12** `#/upload` yellow button: v3 design says «Получить деньги», v2 said «Загрузить»; behaviour stays «mark
  uploaded and pop back». Which label?
- Totals: the design's success amount 8 000 000 ₽ and the `#/light` chip 4 000 000 ₽ are mock values; v3 shows
  the computed total (e.g. 7 000 000 ₽ with the pledge only).
