# credit-activation v3 — spec

Source: Figma file `FyEnitMAmvWmNU9At6rjc4` («Plauground»), section «V4» `60:3874`, read through the Figma MCP
connector on 2026-10-20 (read-only: `get_metadata`, `get_screenshot`, `get_design_context`). Screens are laid out
left to right in flow order; the section has no connectors, the order below is the owner's brief. Reference renders
(1x) are in `design-input/figma/`; every frame render is 383 × 820 (or taller) because it includes a 4 px black device
border with a 40 px corner radius that is NOT part of the UI (crop 4 px on every side for `pnpm qa:diff`).

| File                | Frame (node)                          | Size (metadata) | Route         |
| ------------------- | ------------------------------------- | --------------- | ------------- |
| `00-flow.png`       | section «V4» `60:3874` (2048 px wide) | 3033 × 1196     | —             |
| `01-conditions.png` | «Условия» `68:5777`                   | 375 × 812       | `#/`          |
| `02-heavy.png`      | «Тяжелые» `60:3905`                   | 375 × 812       | `#/heavy`     |
| `03-review.png`     | «Проверка условий» `65:5511`          | 375 × 1012      | `#/review`    |
| `04-documents.png`  | «Несколько документов» `60:4010`      | 375 × 812       | `#/documents` |
| `05-upload.png`     | «Загрузка документов» `60:4022`       | 375 × 812       | `#/upload`    |
| `06-light.png`      | «Легкие» `63:5252`                    | 375 × 1028      | `#/light`     |
| `07-success.png`    | «Успех» `60:4038`                     | 375 × 812       | `#/success`   |

`get_design_context` returns instance overrides as defaults («Title», «Header», «Label», «Replace me»): every text
below is read from the screenshots. Hidden layers (extra `tui-cell [checkbox]`, `tui-input`, legal text frames,
«Комментарий для разработки») are not built.

Assets: everything is already in `assets/icons/` (copied from v2) except one new icon:

- `plus-circle.svg` (new, `tui-ic-medium / plus-circle`, 24 px): a white disc with the plus cut out
  (evenodd, gradient alpha 0.95 → 0.65 baked in). Drawn inside a 40 px `--ds-background-accent-2` avatar at
  inset 20 % (24 px glyph), so the plus shows the blue avatar through it. Use it as an `<img>` (its white is
  the design's own) or as a mask coloured `--ds-text-primary-on-dark`.
- Checkbox on `#/heavy` / `#/light` is `system-checkbox` 22 px: exactly v2 `radio-selected.svg` (#428BF9 disc) +
  `check-ios.svg` mask (16 px, `--ds-text-primary-on-dark`), and `radio-normal.svg` for off (identical paths).
- Badges / chips: `currency-rub.svg`, `percent-circle.svg`, `arrow-circle-right.svg` (same paths as v2).
- Package checks: `check-medium.svg` mask in `--ds-text-positive` (as v2).
- Review avatars: `transport-auto.svg`, `doc.svg`, `briefcase.svg` (as v2; keep v1 `doc.svg`).
- Success illustration: keep `coins-check.png` (v2, 256 × 256). The Figma SVG export of
  `tui-illustrations-common / Light / …` in this frame is a **magnifier**, not the coins drawn in the screenshot —
  wrong export, not used.

## Owner's brief (v3)

- New flow: «Условия» → «Тяжелые» (increase the limit) → «Проверка условий» → documents → «Легкие» → «Успех».
  From «Условия» the user can also go straight to the light conditions with «Дальше».
- Live calculations reusing the v2 `calc.ts` logic.
- No menu axes in v3: no product (КН / ОК), pledge or documents variants. `version.json` has no `axes`; the
  prototype does not read `product` / `pledge` / `docs` query parameters any more (one fixed scenario).
- Yellow buttons lead to the next screen and react to hover and press; iOS push / pop, edge swipe, «Закрыть» reset,
  no forward navigation — keep v2 `nav.ts` behaviour unchanged (see Navigation).

Navigation (owner, authoritative):

| From          | Control                         | Goes to                                                 |
| ------------- | ------------------------------- | ------------------------------------------------------- |
| `#/`          | card «Увеличить лимит»          | push `#/heavy`                                          |
| `#/`          | «Дальше»                        | push `#/light`                                          |
| `#/heavy`     | «Дальше»                        | push `#/documents`                                      |
| `#/documents` | «Загрузить» badge (either card) | push `#/upload`                                         |
| `#/upload`    | yellow button                   | mark both documents uploaded, pop to `#/documents` (v2) |
| `#/documents` | «Дальше»                        | push `#/light`                                          |
| `#/light`     | «Дальше» (both paths)           | push `#/review`                                         |
| `#/review`    | «Получить деньги» (both paths)  | push `#/success`; legal line under the button           |
| `#/success`   | «К счету»                       | reset to `#/` (same as «Закрыть»)                       |

Default paths for deep links (`defaultPath()` in `screens/index.ts`):

- `#/` → `[conditions]`; `#/heavy` → `[conditions, heavy]`; `#/documents` → `[…, heavy, documents]`;
  `#/upload` → `[…, documents, upload]`;
- `#/light` → `[conditions, heavy, documents, light]` (the long path, so back from light returns to the
  documents as in the main scenario; see question Q4);
- `#/review` → `[…, documents, light, review]`; `#/success` → `[…, light, review, success]`.

Paths (owner, 2026-10-20): heavy `#/ → #/heavy → #/documents (+ #/upload) → #/light → #/review → #/success`;
direct `#/ → #/light → #/review → #/success`. «Получить деньги» with the legal line is only on `#/review`.

Viewer scenarios (`version.json` → `scenarios`, «Сценарий» menu on wide screens): «Тяжелые условия» → `#/`
(the full flow) and «Сразу легкие» → `#/light` are suggested; every state is also reachable inside the prototype
(ADR-0021). The builder records the final choice in `version.json`.

## Calculations (reuse `src/calc.ts`, pure, unit-tested)

The design numbers are partly mock-ups that do not agree with each other (see questions); the rules below reuse v2
and reproduce the values that do agree. Numbers shown in the design, per screen:

| Screen        | Numbers drawn                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#/`          | amount **4 000 000 ₽**; «Срок» **5 лет**; «Комиссия» **2,9%**; «Платеж в месяц» **193 500 ₽**                                                                                   |
| `#/heavy`     | pledge on: chips **7 000 000 ₽** (positive) · **17 713 ₽ / мес** (neutral) · **2,5%** (positive)                                                                                |
|               | badges: «+3 000 000 ₽», «−0,5%»; «+2 000 000 ₽»; «до +10 000 000 ₽»                                                                                                             |
| `#/review`    | «Сумма» **7 000 000 ₽**; «Платеж в месяц» **17 713,05 ₽**; rows auto + statement + package; «до 16 декабря 2026»                                                                |
| `#/documents` | «Mercedes-Benz W214, О 7 *** Р»; legal «до 16 сентября»                                                                                                                         |
| `#/light`     | package on, «Снизим комиссию» #2 (До −0,5%) on; chips **4 000 000 ₽** (neutral) · **17 713 ₽ / мес** (positive) · **2,5%** (positive); «сэкономите 10 541 ₽», «от 46 789 ₽/мес» |
| `#/success`   | «Зачисляем **8 000 000 ₽** на счет»                                                                                                                                             |

Rules (v3):

- Base amount `AMOUNT.initial` = 4 000 000 ₽. There is no slider in v3: `#/` shows a static number.
- Total = 4 000 000 + 3 000 000 (pledge auto on `#/heavy`) + 2 000 000 («Проверить данные»). «Предоставить
  выписку» changes no number (v2), only paints the amount chip positive. Pledge only → 7 000 000 ₽ (matches
  `#/heavy` and `#/review`). Success shows the final total (`formatRub(totalAmount)`), not the drawn 8 000 000 ₽.
- Monthly payment: v2 `monthlyPayment` with the package logic of КН: 17 713,05 ₽ × total / 7 000 000 ₽, +15 %
  when «Пакет «Все включено»» is off on `#/light`. Package is on by default. 7 млн → 17 713,05 ₽ (matches
  `#/heavy` chip, `#/review`). Formats as v2: chip «17 713 ₽ / мес» (rubles), review «17 713,05 ₽» (kopecks).
  `#/` «Платеж в месяц»: see Q1 (the drawn 193 500 ₽ does not fit the formula, which gives 10 121,74 ₽ at 4 млн).
- Fee (v2 ОК fee, in tenths of a percent): base 2,9 %; pledge on → 2,5 % (as drawn on `#/heavy`, although the badge
  says −0,5%); «Снизим комиссию» −1% card → −1,0 pp; «Снизим комиссию» «До −0,5%» card → −0,5 pp (v2 turnover step).
  Both «Снизим комиссию» cards are independent checkboxes and their cuts add up: both on → −1,5 pp (2,9 % → 1,4 %,
  with the pledge 2,5 % → 1,0 %; owner, 2026-10-20, replaces Q3). `#/` «Комиссия» shows the base «2,9%».
- So `Choice` loses `product` (v3 combines the КН package with the ОК fee): `package` affects the payment, `pledge`
  and the fee cards affect the fee, `check` the amount. Keep pure functions and extend `test/calc.test.ts`.
- Chip tones (panel on `#/heavy` and `#/light`, same chip component as v2):
  - amount (₽ icon): positive when total > 4 000 000 ₽ or «Предоставить выписку» is on;
  - payment (arrow icon): positive while the package is on **and** the screen is `#/light`; neutral on `#/heavy`
    (as drawn: neutral there, positive on `#/light`; see Q2);
  - fee (% icon): positive when the fee is below 2,9 %, value = current fee («2,5%»).
- Badges inside cards (v2 `badge()`): off = neutral-2, on = positive-pale / positive (the drawn `#/heavy` shows the
  checked pledge card with neutral badges — v2 turned the badges of a checked card green; keep v2, see Q5).

## State (`src/state.ts`)

`{ pledge: boolean, check: boolean, statement: boolean, package: boolean (default true), feeCut: null | 'one' |
'half', docsUploaded: boolean, files: string[] }`. All off by default except the package. «Закрыть» / «К счету»
reset everything. The drawn states (pledge on on `#/heavy`; package + «До −0,5%» on on `#/light`) are visual QA
states, not defaults (Q6). Remove `config.ts` axis parsing (or leave it unused) and slider fields
(`slider`, `sliderBelow`, `pledgeAdded`).

## Platform and frame (unchanged from v2)

- `prototype.json` → `platform: "mobile"`; `<html data-ds-platform="ios">` so typography tokens resolve to the iOS
  scale. The viewer draws the iPhone mockup (ADR-0020); `.app` fills its window (`100dvh`), no own device frame.
- Every screen is its own vertical scroll container with three layers:
  1. top bars, `position: sticky; top: 0`: mock iOS status bar (44 px; `status-time.svg` at left 34 px,
     `status-signal-wifi.svg` right 18 px, `status-battery.svg` right 14 px, vertically centred +1 px) and the app
     bar (44 px), background `--ds-component-navigation-bar-background` + `backdrop-filter: blur(20px)`;
  2. content;
  3. bottom block, `position: sticky; bottom: 0`: yellow button (+ legal text where drawn) and the home indicator
     (34 px tall, 133 × 5 px bar, radius full, `--ds-background-accent-opposite`, 8 px from the bottom). Above the
     button the TUI floating-container fade (`fade-mask.svg`, `--ds-background-base`), or the translucent chips panel
     on `#/heavy` and `#/light`.
  - The end of the scrollable content sits 32 px above the top of the bottom block.
- Status bar and home indicator carry `data-proto-system-bar`; `:root[data-proto-bars='hidden']` pads with
  `var(--proto-safe-area-inset-top)` / `-bottom` (as v2).
- Phone screen and haptics: as v2 (page background `--ds-background-base`, bottom block continues under the home
  indicator). Slider haptics are gone with the slider; `haptics.ts` may stay unused or be removed.

## Shared components (v2 `src/components.ts`, reuse)

- **App bar** (44 px): left = back chevron (`back-ios-alt.svg` mask, `--ds-text-action`, 12 × 24 box at left 8 px,
  glyph 11.4 × 20 at 0 / 2 px) or text «Закрыть»; right = «Закрыть» (body-l, `--ds-text-action`, pr 16). `topBars()`.
- **Primary button large** (`primaryButton(label, act)`): yellow, radius 16, padding 16, body-l label in a
  `px 8 / py 2` container; hover / pressed / focus states as v2.
- **Primary button medium** (success): radius 12, padding 10, body-m label `px 8 / py 3`.
- **Secondary button medium** («Изменить пакет», «График платежей», «Как это работает»): `--ds-background-neutral-1`,
  radius 12, `--ds-text-action`, v2 state tokens.
- **Card-large** (`cardLarge()`): `--ds-background-elevation-1`, radius 24, shadow medium (0 6 34 rgba(0,0,0,.12):
  v2 provisional value), header padding 16 16 12 20 with title heading-m, 22 px «?» tooltip button
  (`tooltip-question.svg` on neutral-1, 22 px circle) and the 22 px checkbox, 16 px gap; description body-l, 12 px below
  the title (owner, v2); badges row 4 px gap, padding 0 20 20 20. The whole card is the control (`role="checkbox"`),
  Space / Enter toggle, focus ring on the card. «?» is a sibling, not nested.
- **Chips panel** (`bottomBlock({ chips, button })`): `--ds-component-tab-bar-background` + `blur(25px)`, 0.5 px top
  divider `--ds-border-normal`, pt 16, chips row centred (4 px gap; chip 30 px tall in metadata, radius full, padding
  0 7 px, ui-s-bold label, 16 px icon + `tui-badge` slot), 16 px gap, button 56 px, home indicator 34 px. Total 152 px.
- **Info card** (v2 offer `infoCards()`, ОК layout): neutral-1, radius 16, py 12, pl 8 pr 16; caption ui-s secondary,
  value body-l (drawn as heading-s Semibold 17 in the context, but the screenshot shows regular weight: keep v2),
  16 px chevron (`chevron-right-small.svg` mask, `--ds-text-secondary`) in a button with 4 px padding, pt 4.
- **Doc card**, **file field**, **bullets**, **disclosure**: v2 `documents.ts` / `sts-content.ts` unchanged.

## Typography (v2 table, unchanged; owner 2026-10-16: exactly as in Figma, token tracking)

| Figma style                  | Font                           | Size / line      | Class                                  |
| ---------------------------- | ------------------------------ | ---------------- | -------------------------------------- |
| iOS/Heading Large, Heading L | SF Pro Display Bold            | 30 / 36          | `.t-heading-l`                         |
| iOS/Heading M                | SF Pro Display Bold            | 20 / normal (24) | `.t-heading-m`                         |
| iOS/Heading S                | SF Pro Text Semibold           | 17 / normal (20) | `.t-heading-s`                         |
| iOS/Body L                   | SF Pro Text Regular            | 17 / normal (20) | `.t-body-l`, large button label        |
| iOS/Body M                   | SF Pro Text Regular            | 15 / normal (18) | `.t-body-m`, medium button label       |
| iOS/UI S, UI S Bold          | SF Pro Text Regular / Semibold | 13 / normal (16) | `.t-ui-s`, badge, chip                 |
| iOS/Numbers 2XL              | SF Pro Rounded Bold            | 48 / normal (57) | `.t-number-2xl`                        |
| Desktop/Body M, Body S       | Neue Haas Unica W1G Regular    | 15 / 24, 13 / 20 | file input label and hint (`#/upload`) |

Letter spacing uses the TUI token values (variable SF Pro table), not the Figma static values (v2 decision).
SF Pro is never embedded. Line height "normal" means 17 → 20, 15 → 18, 13 → 16 px.

## Screens

### `#/` «Условия» (`01-conditions.png`, `68:5777`, was `60:3875`) — maps to v2 `offer.ts` (ОК info-card layout, no slider)

- Top bars: status bar + app bar with only «Закрыть» on the left (no back, no right action). Edge swipe off.
- Header (`tui-header`, pt 12, px 16): «Одобрили кредит» / «ИП Константинопольский К.&nbsp;К.» heading-s centred
  (two lines). 24 px gap.
- Amount `tui-labs-input-number-plain` (375 × 65, pb 8): «4 000 000 ₽» numbers-2-xl centred, static (no slider,
  no input). The v2 slider block and its labels are removed.
- Info cards (pt 20, px 16, 16 px gap; cards 72 px tall): row of two 163.5 px cards «Срок / 5 лет ›» and
  «Комиссия / 2,9%» (no chevron), then a full-width card «Платеж в месяц / 193 500 ₽ ›» (value: Q1). Visual only.
- Card «Увеличить лимит» (`60:3897`, pt 24, px 16; card 343 × 88): card-large white, radius 24, shadow medium,
  py 12, content px 4; `tui-cell` min-height 56, px 16: 40 px avatar `--ds-background-accent-2` with
  `plus-circle.svg` (24 px at inset 20 %), 16 px gap, text column (py 8, 4 px gap): title «Увеличить лимит»
  heading-m, description «До 9 млн ₽ с условиями» body-l (Figma updated 2026-10-20). The whole card is a button (`data-action` push
  `#/heavy`), focus ring + pressed state (scale 0.98 as the buttons, or the neutral pressed overlay).
- Bottom: «Дальше» → `#/light`; no fade needed (content is short), home indicator. Bottom block is 90 px
  (button 56 + bar 34), content pb 20.

### `#/heavy` «Как хотите увеличить лимит» (`02-heavy.png`, `60:3905`) — maps to v2 `options.ts`

- Top bars: back + «Закрыть». Large title (`tui-header [large]`, px 16, py 8, at y 96 = 8 px under the bars):
  «Как хотите увеличить лимит» heading-l (wraps to 2 lines: «Как хотите увеличить / лимит»).
- Three option cards, checkbox semantics, independent (multi-select; the review shows pledge + statement together).
  Gaps as drawn: 16 px above card 1 and 2, 20 px above card 3 (Q7). Card 343 wide, 128 px tall (1-line descr.):
  1. «Оставить в залог авто» / «Mercedes-Benz W214» / badges «₽ +3 000 000 ₽», «% −0,5%» — drawn checked.
  2. «Проверить данные» / «Обычно занимает до&nbsp;1 рабочего дня» / badge «₽ +2 000 000 ₽».
  3. «Предоставить выписку» / «По счетам из других банков» / badge «₽ до +10 000 000 ₽».
     Each has «?» (visual only) and the 22 px checkbox.
- Sticky chips panel (`60:3954`, 152 px): chips «₽ 7 000 000 ₽» · «→ 17 713 ₽ / мес» · «% 2,5%» (drawn values with
  the pledge on), recalculated live on every toggle (amount, payment, fee; tones per Calculations); «Дальше» →
  `#/review`.
- `refresh(root)` re-renders cards and chips before it is uncovered (v2 pattern).

### `#/review` «Проверьте, все ли верно» (`03-review.png`, `65:5511`, was `60:4042`) — maps to v2 `review.ts`

- Top bars: back + «Закрыть». Header (`tui-header [large]` 375 × 114, px 16, py 8, 6 px gap): «Проверьте,<br />все
  ли верно» heading-l + «Условия доступны до 16 декабря 2026» body-l. Cards start 12 px below (y 222).
- Card «Сумма и платеж» (240 px): rows «Сумма / 7 000 000 ₽», «Платеж в месяц / 17 713,05 ₽» (caption ui-s
  secondary, value body-l), no «Комиссия» row (see Q8), footer secondary «График платежей». Background
  `--ds-background-base` (`tui-card-large`, radius 24, drop shadow medium).
- Card «Залог и условия» (304 px with 3 rows), 20 px gap: avatar rows in this order, each only when on —
  pledge → `transport-auto.svg` «Mercedes-Benz W214» / «Понадобится проверка» (Figma updated 2026-10-20); check → `doc.svg` «Проверка данных» /
  «Обычно занимает до&nbsp;1 рабочего дня» (not drawn, v2 text); statement → `doc.svg` «Выписка из другого банка» /
  «Обычно проверяем за 2 минуты»; package → `briefcase.svg` «Пакет «Все включено»» / «Документы не потребуются».
  Footer secondary «Как это работает». Drawn: pledge + statement + package.
- Card «Рублевый счет» (84 px), 20 px gap: «Рублевый счет» heading-m + «Изменить» text button (action) /
  «Куда поступят деньги» body-m secondary.
- Bottom: «Получить деньги» → `#/success` with the legal line below (owner, 2026-10-20). Always this variant (no «Проверка без опций» in v3; Q9).

### `#/documents` «Загрузите документы» (`04-documents.png`, `60:4010`) — v2 `documents.ts`, identical layout

Compared with v2 `04b-documents-two.png`: same layout and texts (large title pt 12 pb 24; cards «Фото СТС авто» /
«Mercedes-Benz W214, О&nbsp;7&nbsp;***&nbsp;Р» and «Гарантийное письмо» / «Загрузите бухгалтерские карточки,
сформированные в&nbsp;1С», 20 px gap, «Загрузить» badge buttons). Differences:

- always two documents (no `docs` axis); the cards never depend on what was chosen on `#/heavy` (Q10);
- `next()`: «Загрузить» badges → `#/upload` (as v2); the yellow button is **«Дальше»** → `#/light` (owner,
  2026-10-20; the design draws «Получить деньги»), it does not wait for the upload (Q11). No legal line here: it
  moved to `#/light` with «Получить деньги»;
- after the upload both badges show «Загружено» (positive), as v2.

### `#/upload` «Нужны фото СТС, чтобы получить деньги» (`05-upload.png`, `60:4022`) — v2 `upload.ts` + `sts-content.ts`

Same as v2 `04c-upload.png` (bullets, «Образцы обеих сторон СТС» disclosure with `sts-sample.jpg`, file field
«Выберите файлы» / «Файлы jpg, png, heif, heic не больше 10 МБ»; the drawn legal line is not built, owner
2026-10-20). Only difference: the yellow button
label is **«Получить деньги»** in v3 (v2: «Загрузить»). Behaviour stays v2 (marks `docsUploaded`, pops back to
`#/documents`), per the brief; the label is Q12.

### `#/light` «Выберите улучшения условий» (`06-light.png`, `63:5252`, was `60:3965`) — maps to v2 `options.ts`

- Top bars: back + «Закрыть». Large title (px 16, py 8): «Выберите улучшения условий» heading-l (2 lines).
- Content pt 16, cards 20 px apart:
  1. «Пакет «Все включено»» (308 px): three check rows (`check-medium.svg`, positive) body-l «Ставка ниже на&nbsp;15% —
     сэкономите 10&nbsp;541&nbsp;₽», «Бесплатное обслуживание счета для бизнеса», «Без комиссии за досрочное
     погашение»; footer secondary «Изменить пакет» (visual only). No badges. Header pb 16 (v2: 8 px title → list).
     Drawn checked (default on).
  2. «Снизим комиссию» (148 px) / «−1% за&nbsp;каждые 100&nbsp;000&nbsp;₽, выплаченных сотрудникам в&nbsp;месяц»
     (2 lines, Figma updated 2026-10-20) / badge «% −1%». Drawn off.
  3. «Снизим комиссию» (148 px) / «При обороте по счету для бизнеса в&nbsp;Т‑Банке от&nbsp;46&nbsp;789&nbsp;₽/мес»
     / badge «% До −0,5%». Drawn checked.
- Sticky chips panel (152 px): «₽ 4 000 000 ₽» (neutral) · «→ 17 713 ₽ / мес» (positive) · «% 2,5%» (positive),
  live; «Дальше» → `#/review` on both paths, no legal line (Figma updated 2026-10-20).

### `#/success` (`07-success.png`, `60:4038`) — v2 `success.ts`, identical layout

`tui-block-status` (375 × 284, centred): `coins-check.png` 128 px, pb 24; «Зачисляем N ₽ на&nbsp;счет» heading-s
(N = final total, drawn «8 000 000 ₽»); «Обычно это занимает несколько минут.<br />Когда закончим, пришлем СМС»
body-m secondary (max 290 px); pt 24 medium yellow «К счету» → reset to `#/`. App bar empty, no back, edge swipe off;
bottom `tui-tab-bar / SME` is only the white bar with the home indicator (v2 `bottomBlock({})`). No differences
from v2 besides the amount.

## Navigation (native iOS feel, v2 `nav.ts` unchanged)

- Stack keyed by route; `history.state = { i }`; `Screen.next()` returns the route to push and may depend on state;
  `refresh(root)` on the page below before a pop / at drag start; `beforeAction(control)` for the upload mark.
  For `#/` the two targets (card → `#/heavy`, «Дальше» → `#/light`) need either `next(control)` receiving the control
  or a `data-route="#/heavy"` attribute read by nav — a small nav change the builder decides and records.
- Push / pop: slide from the right, previous screen −30 % with dimming, ≈ 0.5 s `@proto/motion`; interactive edge
  swipe (20 px edge, 50 % or flick); disabled on `#/` and `#/success`. Browser back pops; on `#/success` it resets.
- «Закрыть» on any screen and «К счету»: reset state and stack to `#/`.
- No forward navigation; hand-typed hashes push the default path. `prefers-reduced-motion`: cross-fade.

## Visual only (out of scope)

«Срок», «Платеж в месяц» on `#/`, «?», «Изменить пакет», «График платежей», «Как это работает», «Изменить»,
«Образцы обеих сторон СТС», the «с условиями» link.

## Open questions (also in `qa/progress.md`)

Q1–Q12 are listed in the ledger; until answered the builder follows the defaults written above.
