# credit-activation v4 — spec

Source: Figma file `FyEnitMAmvWmNU9At6rjc4` («Plauground»), section «V5» `73:23561`, read through the Figma MCP
connector on 2026-10-25 (read-only: `get_metadata`, `get_screenshot`, `get_design_context`). The repo numbering
lags Figma by one (v3 = section «V4»), so section «V5» is repo **v4**. Reference renders (1x) are in
`design-input/figma/`; frame renders are 383 × 820 with a 4 px device border that is NOT part of the UI (crop 4 px
on every side for `pnpm qa:diff`). `03-review`, `04-documents`, `05-upload`, `07-success` are the v3 references of
the screens v4 keeps.

| File                          | Frame (node)                 | Route                      |
| ----------------------------- | ---------------------------- | -------------------------- |
| `00-flow.png`                 | section «V5» `73:23561`      | —                          |
| `01-credit-kn.png`            | «Кредит КН» `73:22831`       | `#/` (КН)                  |
| `01-credit-ok.png`            | «Кредит ОК» `74:23562`       | `#/` (ОК)                  |
| `02-conditions.png`           | «Условия» `73:22591`         | `#/conditions`             |
| `02b-conditions-selected.png` | «Условия выбраны» `73:22711` | `#/conditions` (pledge on) |
| `06-tariffs.png`              | «Тарифы» `90:5528`           | `#/tariffs` (КН)           |

## Owner's brief (2026-10-25)

- New version; a new control in the viewer menu with two variants, КН and ОК (`axes` → `product`, ADR-0022).
- «Кредит» is the same in КН and ОК. «400 000 ₽ с улучшением условий» → «Условия» with a smooth move of the amount
  (Header), a fade of the navbar and of every other element of both screens; «Дальше» does not animate.
- «Условия»: the «Барабан условий» scrolls like an iOS picker: top and bottom cards scale a little and go under the
  conditions block and «Дальше»; under those blocks a small gradient (opacity 100 → 0) so the wheel does not butt
  into them. A card is chosen by a tap anywhere on it or on «+»; the «+» and the header chips change as in
  «Условия выбраны».
- After «Условия» (and after «Кредит» in ОК): «Проверка условий» with the forks of the earlier versions.
- КН: «Дальше» on «Кредит» first opens «Тарифы» («Варианты платежа»), a horizontal slider of tariff cards; the
  chosen tariff drives the payment. «Тарифы» appear only from «Кредит» and only in КН.
- After «Проверка условий» — v2 fork: pledge on → «Дальше» → «Загрузите документы» (→ upload) → «Получить
  деньги» → «Успех»; pledge off → «Получить деньги» with the legal line → «Успех».

## Owner's review of the first build (2026-10-25)

- Fee with the pledge stays 2,0 % (Q1: answered «ОК»); the wheel, the tariffs slider and the fork stay as built.
- «Кредит» has two states, frames «Кредит КН» and «Кредит ОК» (see `#/`).
- The payment chip on «Условия» turns positive (green) when the payment is recalculated downwards, like the fee chip.
- «Тариф» becomes «Пакет» in every visible text (the code keeps `tariff`).
- The inline hint gets its tail back; «Залог авто»: the «+» sits 16 px above the card's bottom edge.
- ОК: no «Залог авто» card on «Кредит». КН: no «Залог авто» card on «Условия» (the pledge lives on
  «Кредит»).
- Back chevron in the app bar placed as drawn: 11 × 19 glyph at (5, 2.5) in its 24 px box.

## Navigation

| From           | Control                                | Goes to                                                                                     |
| -------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `#/`           | «+ 400 000 ₽ с улучшением условий ›»   | push `#/conditions` (shared transition)                                                     |
| `#/`           | «Залог авто» card / «+»                | toggles the pledge (same flag as on conditions)                                             |
| `#/`           | «Дальше»                               | КН: `#/tariffs`; ОК: `#/review`                                                             |
| `#/conditions` | «Дальше»                               | КН: `#/tariffs` (owner, 2026-10-26), but `#/review` when «Тарифы» are below; ОК: `#/review` |
| `#/tariffs`    | «Выбрать» (Универсальный, Минимальный) | sets the tariff, push `#/review`                                                            |
| `#/tariffs`    | «Выбрать» («Ваши условия»)             | push `#/conditions` (slide: no shared amount); `#/review` when «Условия» are below          |
| `#/review`     | «Дальше» (pledge) / «Получить деньги»  | `#/documents` / `#/success`                                                                 |
| `#/documents`  | «Загрузить» / «Получить деньги»        | `#/upload` (back marks both uploaded) / `#/success`                                         |
| `#/success`    | «К счету»                              | reset to `#/`                                                                               |

Deep links (`defaultPath`): `#/conditions`, `#/tariffs` → `[credit, it]` (`#/tariffs` in ОК falls back to `#/`); the rest follow the product's main path
(КН `#/ → #/tariffs → #/review → #/documents`, ОК `#/ → #/conditions → #/review → #/documents`), `#/success` on top
of `#/review`, `#/upload` on top of `#/documents`.

## Calculations (`src/calc.ts`, unit-tested)

- Base 4 000 000 ₽; pledge +200 000 ₽, «Проверить данные» +100 000 ₽ (badges); «Предоставить выписку» changes no
  number. Pledge only → 4 200 000 ₽ (as «Условия выбраны»).
- Fee: base 2,5 % (header chip); pledge −0,5 pp, «Снизить комиссию» −1 pp and «До −0,5%» −0,5 pp, adding up. The fee
  chip turns positive when the fee is below 2,5 %. «Условия выбраны» draws «2,5%» positive with the pledge (Q1).
- Payment: 17 713,05 ₽ per 4 000 000 ₽ at 2,5 % (header chip), proportional to the amount and to (1 + fee), so a
  fee cut lowers it (Q8); its chip turns positive when it is below the offer's payment. A КН tariff replaces it with
  17 713,05 / 33 500 ₽ per 4 000 000 ₽ (cards), scaled by the amount only; «Ваши условия» keeps the formula. The tariff cards show their payment at the current amount. «Платеж в месяц» on `#/`
  shows the formula value, not the drawn 193 500 ₽ (Q2).
- ОК shows «Комиссия» on `#/` and a «Комиссия» row on `#/review` (v2); КН shows the package row in «Залог и условия».

## Screens

### `#/` «Кредит» (КН `73:22831`, ОК `74:23562`)

- iOS 26 app bar: one 44 px glass circle on the left with `close-ios26` (17.3 px glyph) → «Закрыть». The bar is
  98 px (status 44 + 44 + 10). Glass: white disc + provisional small shadow (no TUI token, Q3).
- `tui-header` pt 12: «Одобрили кредит / ИП Константинопольский К. К.» heading-s centred; 20 px; amount
  numbers-2xl (57 px), `data-shared="amount"`.
- `tui-inline-hint`: 30 × 12 tail (neutral-1) pointing at the amount, body 44 px neutral-1 radius 22, px 10: `plus`
  24 px (18 px glyph, action), label body-m px 6, chevron 7 × 16 tertiary. Pressed: the whole bubble, tail included, scales to 0,98
  and takes the pressed fill (hover: the hover fill).
- Info cards (pt 8 + 16, 72 px; caption ui-s secondary, value heading-s). КН: «Срок / 5 лет ›», «Платеж в месяц /
  … ›», 20 px gap. ОК: «Срок / 5 лет ›» | «Комиссия / 2,5%» (no chevron, the current fee), then the wide «Платеж в
  месяц / … ›»; 16 px gaps. The ОК frame draws 2,9 %; v4 shows the fee of the conditions (Q9).
- Pledge card, КН only (pt 20): card-large white radius 24 shadow medium, py 16 px 20: «Залог авто» heading-m + «Изменить»
  (body-l action, visual only); 16 px; «Mercedes-Benz W214» body-m; 12 px; badges «+200 000 ₽» «−0,5%»
  (neutral-1, ui-s-bold); `tui-labs-action` 56 px circle centred on the description and the badges, 16 px above the
  bottom edge (neutral-1, blue `plus` 18 px; on: positive-pale with
  green `check-pragmatic` 24 px).
- Bottom: «Дальше» (56 px) + home indicator, no fade.

### `#/conditions` «Условия» / «Условия выбраны» (`73:22591`, `73:22711`)

- App bar: back (`back-ios26`: 11 × 19 glyph at (5, 2.5) in a 24 px box) and close (`close-ios` 24) glass circles.
- Conditions block (part of the sticky top bars, plain background): amount pt 8 pb 8 (`data-shared`), chips row
  (`tui-chip` 36 px, px 10, neutral-1, 8 px gap, glyph secondary, ui-s-bold): «5 лет» (calendar), fee (percent,
  positive-pale + positive when lowered), «17 713 ₽ / мес» (arrow; positive when the payment is below the offer's).
- Wheel: option cards, 20 px apart (pt 20); ОК has all five, КН has no pledge card: «Залог авто» (ОК; drawn like КН's card on «Кредит» — «Изменить» in the title row, «Mercedes-Benz W214», +200 000 ₽, −0,5%), «Проверить данные» /
  «Занимает до 1 рабочего дня» (+100 000 ₽), «Предоставить выписку» / «По счетам из других банков» (До +10 000 000 ₽),
  «Снизить комиссию» / «За каждые 100 000 ₽, выплаченных сотрудникам в месяц» (% −1%, neutral-2), «Снизить
  комиссию» / «Поддерживайте оборот по счету для бизнеса в Т‑Банке от 46 789 ₽/мес» (% До −0,5%; the frame's
  «Поддержтвать обороте» typo fixed, Q4). Title heading-m, 4 px, description body-m (230 px), 12 px, badges.
- Wheel motion (`src/wheel.ts`): a card that starts to slide past a band edge (bottom of the conditions block / top of the
  bottom block) gets `perspective(800px) rotateX(±20° · p) scale(1 − 0.1 · p)` and opacity `1 − 0.6 · p` (p = the share of the card past the edge), origin at
  the side away from the edge. 24 px gradients
  (`--ds-background-base` → transparent) below the conditions block and above «Дальше». Off under reduced motion.
- Tap anywhere on a card or its «+» toggles it (`role="checkbox"`, Space / Enter); the amount counts (from the first tap on) to the new
  value, the chips update.

### Shared transition `#/` ↔ `#/conditions` (`nav.ts`)

- No slide: the amount moves from y 170 to y 106 (aligned by its text, not its box: the two amounts have different
  paddings) (expressive ease, slow duration); the `[data-fade]` parts of
  «Кредит» (title, hint, info cards, pledge card, app bar) fade out over the first half, those of «Условия» (app
  bar, chips, gradient, wheel rising 12 px) fade in over the second; status bar and «Дальше» stay. Back (chevron,
  browser back, edge swipe scrubbing the same draw) reverses it. Reduced motion: the usual cross-fade.

### `#/tariffs` «Варианты платежа» (`90:5528`, КН; visible texts say «Пакет»)

- App bar back + close; `tui-header [large]` px 16 py 8: heading-l. 20 px.
- Horizontal snap slider (`scroll-snap-type: x mandatory`), 300 px cards, 16 px gap and inset, equal heights:
  neutral-1-on-base, radius 24; header pt 28 px 20 pb 12: payment heading-l / subtitle body-l (8 px), «?» 22 px centred on the payment line;
  check list (16 px `check-small` in accent-2, py 6, 12 px gap; the texts are body-l (owner, 2026-10-25) and the
  check sits on the middle of the first line's x-height, 1 px higher for optical balance; 32 px below the list); footer px 20 pb 20 medium yellow button. «Часто выбирают» badge
  (accent-2, on-dark, ui-s-bold, 28 px high) at top −14, left 20 of the first card.
- Cards (texts as drawn, owner 2026-10-26): «17 713 ₽/мес» «Пакет «Универсальный»» and «33 500 ₽/мес» «Пакет
  «Минимальный»», both with «Ставка ниже на 15% — сэкономите 10 541 ₽» / «Бесплатное обслуживание счета для бизнеса» /
  «Без комиссии за досрочное погашение» (Q5) · «Ваши условия» «Выбираете сами» with one body-l line without a check,
  «Сможете самостоятельно настроить все условия по платежу»; every card ends with «Выбрать».

### `#/review`, `#/documents`, `#/upload`, `#/success`

As v3 (references `03`–`07`), with: v4 app bar; payment from the tariff; rows «Снижение комиссии» for the fee cards
and «Пакет «…»» (briefcase) for a КН package, no «Пакет «Все включено»»; ОК «Комиссия» row; the button fork above.

## Questions (ledger)

- Q1. «Условия выбраны» keeps «2,5%» (now positive) with the pledge although its badge says −0,5%; v4 shows 2,0%.
- Q2. «Платеж в месяц» on «Кредит» draws 193 500 ₽; v4 shows the formula value (17 713 ₽ at 4 млн).
- Q3. No TUI token for the iOS 26 liquid glass; a white disc with a provisional small shadow.
- Q4. Second «Снизить комиссию» text: typo in the frame («Поддержтвать обороте»), fixed.
- Q5. «Минимальный» costs more than «Универсальный» (33 500 against 17 713 ₽) and repeats its bullets, as drawn.
- Q6. The new iOS 26 app bar is used on every screen (review, documents, upload had text «Закрыть» in V4).
- Q7. A deep link to `#/documents` builds a review underneath with nothing chosen (no pledge), so back shows the
  no-pledge review; the in-app path always arrives with the pledge.
- Q8. The design has no rule for a falling payment; v4 makes it proportional to (1 + fee): «Снизить комиссию»
  −1 pp gives 17 540,24 ₽ (chip green), the pledge still raises it (18 507,98 ₽ at 4,2 млн and 2,0 %).
- Q9. «Кредит ОК» draws «Комиссия 2,9%»; v4 shows the offer's 2,5 % (the same number as the conditions chip).
