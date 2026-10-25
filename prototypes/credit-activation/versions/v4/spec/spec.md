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
| `01-credit.png`               | «Кредит» `73:22831`          | `#/`                       |
| `02-conditions.png`           | «Условия» `73:22591`         | `#/conditions`             |
| `02b-conditions-selected.png` | «Условия выбраны» `73:22711` | `#/conditions` (pledge on) |
| `06-tariffs.png`              | «Тарифы» `73:22577`          | `#/tariffs`                |

## Owner's brief (2026-10-25)

- New version; a new control in the viewer menu with two variants, КН and ОК (`axes` → `product`, ADR-0022).
- «Кредит» is the same in КН and ОК. «До 4,5 млн ₽ с условиями» → «Условия» with a smooth move of the amount
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

## Navigation

| From           | Control                                | Goes to                                             |
| -------------- | -------------------------------------- | --------------------------------------------------- |
| `#/`           | «+ До 4,5 млн ₽ с условиями ›»         | push `#/conditions` (shared transition)             |
| `#/`           | «Залог авто» card / «+»                | toggles the pledge (same flag as on conditions)     |
| `#/`           | «Дальше»                               | КН: `#/tariffs`; ОК: `#/review`                     |
| `#/conditions` | «Дальше»                               | `#/review`                                          |
| `#/tariffs`    | «Выбрать» (Универсальный, Минимальный) | sets the tariff, push `#/review`                    |
| `#/tariffs`    | «Настроить» («Свои условия»)           | push `#/conditions` (slide: no shared amount)       |
| `#/review`     | «Дальше» (pledge) / «Получить деньги»  | `#/documents` / `#/success`                         |
| `#/documents`  | «Загрузить» / «Получить деньги»        | `#/upload` (back marks both uploaded) / `#/success` |
| `#/success`    | «К счету»                              | reset to `#/`                                       |

Deep links (`defaultPath`): `#/conditions`, `#/tariffs` → `[credit, it]`; the rest follow the product's main path
(КН `#/ → #/tariffs → #/review → #/documents`, ОК `#/ → #/conditions → #/review → #/documents`), `#/success` on top
of `#/review`, `#/upload` on top of `#/documents`.

## Calculations (`src/calc.ts`, unit-tested)

- Base 4 000 000 ₽; pledge +200 000 ₽, «Проверить данные» +100 000 ₽ (badges); «Предоставить выписку» changes no
  number. Pledge only → 4 200 000 ₽ (as «Условия выбраны»).
- Fee: base 2,5 % (header chip); pledge −0,5 pp, «Снизить комиссию» −1 pp and «До −0,5%» −0,5 pp, adding up. The fee
  chip turns positive when the fee is below 2,5 %. «Условия выбраны» draws «2,5%» positive with the pledge (Q1).
- Payment: 17 713,05 ₽ per 4 000 000 ₽ (header chip), proportional to the amount; a КН tariff replaces it with
  33 500 / 17 500 ₽ per 4 000 000 ₽ (cards), scaled; «Свои условия» keeps the formula. «Платеж в месяц» on `#/`
  shows the formula value, not the drawn 193 500 ₽ (Q2).
- ОК shows a «Комиссия» row on `#/review` (v2); КН shows the tariff row in «Залог и условия».

## Screens

### `#/` «Кредит» (`73:22831`)

- iOS 26 app bar: one 44 px glass circle on the left with `close-ios26` (17.3 px glyph) → «Закрыть». The bar is
  98 px (status 44 + 44 + 10). Glass: white disc + provisional small shadow (no TUI token, Q3).
- `tui-header` pt 12: «Одобрили кредит / ИП Константинопольский К. К.» heading-s centred; 20 px; amount
  numbers-2xl (57 px), `data-shared="amount"`.
- `tui-inline-hint`: 30 × 12 tail (neutral-1) pointing at the amount, body 44 px neutral-1 radius 22, px 10: `plus`
  24 px (18 px glyph, action), label body-m px 6, chevron 7 × 16 tertiary.
- Info cards (pt 8 + 16, 20 px gap, 72 px): «Срок / 5 лет ›», «Платеж в месяц / … ›»; caption ui-s secondary,
  value heading-s.
- Pledge card (pt 20): card-large white radius 24 shadow medium, py 16 px 20: «Залог авто» heading-m + «Изменить»
  (body-l action, visual only); 16 px; «Mercedes-Benz W214» body-m; 12 px; badges «+200 000 ₽» «−0,5%»
  (neutral-1, ui-s-bold); `tui-labs-action` 56 px circle (neutral-1, blue `plus` 18 px; on: positive-pale with
  green `check-pragmatic` 24 px).
- Bottom: «Дальше» (56 px) + home indicator, no fade.

### `#/conditions` «Условия» / «Условия выбраны» (`73:22591`, `73:22711`)

- App bar: back (`back-ios26` 11 × 19) and close (`close-ios` 24) glass circles.
- Conditions block (part of the sticky top bars, plain background): amount pt 8 pb 8 (`data-shared`), chips row
  (`tui-chip` 36 px, px 10, neutral-1, 8 px gap, glyph secondary, ui-s-bold): «5 лет» (calendar), fee (percent,
  positive-pale + positive when lowered), «17 713 ₽ / мес» (arrow).
- Wheel: five option cards, 20 px apart (pt 20): «Оставить в залог авто» (+200 000 ₽, −0,5%), «Проверить данные» /
  «Занимает до 1 рабочего дня» (+100 000 ₽), «Предоставить выписку» / «По счетам из других банков» (До +10 000 000 ₽),
  «Снизить комиссию» / «За каждые 100 000 ₽, выплаченных сотрудникам в месяц» (% −1%, neutral-2), «Снизить
  комиссию» / «Поддерживайте оборот по счету для бизнеса в Т‑Банке от 46 789 ₽/мес» (% До −0,5%; the frame's
  «Поддержтвать обороте» typo fixed, Q4). Title heading-m, 4 px, description body-m (230 px), 12 px, badges.
- Wheel motion (`src/wheel.ts`): a card that starts to slide past a band edge (bottom of the conditions block / top of the
  bottom block) gets `perspective(800px) rotateX(±20° · p) scale(1 − 0.1 · p)` and opacity `1 − 0.6 · p` (p = the share of the card past the edge), origin at
  the side away from the edge. 24 px gradients
  (`--ds-background-base` → transparent) below the conditions block and above «Дальше». Off under reduced motion.
- Tap anywhere on a card or its «+» toggles it (`role="checkbox"`, Space / Enter); the amount counts to the new
  value, the chips update.

### Shared transition `#/` ↔ `#/conditions` (`nav.ts`)

- No slide: the amount moves from y 170 to y 106 (expressive ease, slow duration); the `[data-fade]` parts of
  «Кредит» (title, hint, info cards, pledge card, app bar) fade out over the first half, those of «Условия» (app
  bar, chips, gradient, wheel rising 12 px) fade in over the second; status bar and «Дальше» stay. Back (chevron,
  browser back, edge swipe scrubbing the same draw) reverses it. Reduced motion: the usual cross-fade.

### `#/tariffs` «Варианты платежа» (`73:22577`, КН)

- App bar back + close; `tui-header [large]` px 16 py 8: heading-l. 20 px.
- Horizontal snap slider (`scroll-snap-type: x mandatory`), 300 px cards, 16 px gap and inset, equal heights:
  neutral-1-on-base, radius 24; header pt 16 px 20 pb 12: payment heading-m / subtitle body-m (8 px), «?» 22 px;
  check list (16 px `check-small` in accent-2, body-m, py 6, 12 px gap); footer px 20 pb 20 medium yellow button.
  «Часто выбирают» badge (accent-2, on-dark, ui-s-bold) at top −10, left 20 of the first card.
- Cards: «33 500 ₽/мес» «Универсальный» (drawn bullets) · «17 500 ₽/мес» «Минимальный» · «Свои условия» «На ваш
  выбор» → «Настроить». Bullets of cards 2–3 are Lorem ipsum in the frame: placeholders (Q5).

### `#/review`, `#/documents`, `#/upload`, `#/success`

As v3 (references `03`–`07`), with: v4 app bar; payment from the tariff; rows «Снижение комиссии» for the fee cards
and «Тариф «…»» (briefcase) for a КН tariff, no «Пакет «Все включено»»; ОК «Комиссия» row; the button fork above.

## Questions (ledger)

- Q1. «Условия выбраны» keeps «2,5%» (now positive) with the pledge although its badge says −0,5%; v4 shows 2,0%.
- Q2. «Платеж в месяц» on «Кредит» draws 193 500 ₽; v4 shows the formula value (17 713 ₽ at 4 млн).
- Q3. No TUI token for the iOS 26 liquid glass; a white disc with a provisional small shadow.
- Q4. Second «Снизить комиссию» text: typo in the frame («Поддержтвать обороте»), fixed.
- Q5. Bullets of «Минимальный» and «Свои условия» are placeholders.
- Q6. The new iOS 26 app bar is used on every screen (review, documents, upload had text «Закрыть» in V4).
