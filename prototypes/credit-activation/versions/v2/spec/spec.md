# credit-activation v2 — spec

Source: Figma file `FyEnitMAmvWmNU9At6rjc4` («Plauground»), read through the Figma MCP connector on
2026-10-16: section КН `42:2765`, section ОК `42:2292`, common flow `42:5516` (states top to bottom, screens left
to right). Reference renders (1x; a 4 px black device border and 40 px corner radius that are NOT part of the UI)
are in `design-input/figma/`:

| File                                                                                                                                 | Frame                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `00-section-kn.png`, `00-section-ok.png`, `00-flow.png`                                                                              | whole sections (overview)                                        |
| `01-kn-offer-auto.png` (42:2926), `01-kn-offer-realty.png` (42:2873)                                                                 | offer, one pledge, off                                           |
| `01-ok-offer-two-pledges.png` (42:2442)                                                                                              | ОК offer, two pledges, realty on at 7 000 000 ₽, fee 2,9% → 2,5% |
| `01b-pledge-card-active.png` (42:2840), `01c-fee-active.png` (42:2474)                                                               | active pledge card, active fee                                   |
| `02-kn-options.png` (42:2979), `02c-ok-options.png` (42:2691), `02b-ok-options-panel.png` (42:2725)                                  | «Доп. опции»                                                     |
| `03-kn-review.png` (42:3025), `03-ok-review.png` (42:2510), `03b-review-no-options.png` (42:3116)                                    | review                                                           |
| `04a-documents-one.png` (42:6448), `04b-documents-two.png` (42:3208), `04c-upload.png` (42:9009), `05-documents-ready.png` (42:9112) | documents                                                        |
| `06-success.png` (42:3236)                                                                                                           | success                                                          |

Assets: `assets/icons/*` (v1 set plus `currency-rub.svg` 16 px, `percent-circle.svg` 14.67 px inner glyph,
`arrow-circle-right.svg` 14 px inner glyph, `briefcase.svg` 24 px). The two inner glyphs are drawn as CSS masks
in a 16 px box at `mask-position: 1px 1px` with their own size (14 / 14.667 px), coloured by tokens; `currency-rub`
is a full 16 px icon used as a mask. Do not use `doc.svg`/`star` exports from Figma: keep v1 `doc.svg`.

## Owner's brief (v2)

- Remove the background glow behind the prototype (done in the shared viewer, nothing to do here).
- Two main scenarios КН and ОК; variants авто / недвижимость / 2 залога; documents 1 док / 2 дока. They are chosen in
  the viewer's bottom menu (three captioned segmented controls) and arrive as query parameters (see below). The
  old screen and version menus are gone.
- Yellow buttons lead to the next screen and react to hover and press. Back works as in iOS, transitions are
  native push / pop (keep v1 `nav.ts` behaviour: parallax, dimming, edge swipe, no forward, «Закрыть» reset).
- Offer slider: reaching 7 000 000 ₽ switches the pledge card on (radio checked, its chips turn green) and, in ОК,
  the fee shows «2,9% → 2,5%». Moving the slider back below switches it off again. Tapping a pledge card switches
  it on and moves the slider to 7 000 000 ₽ (4 000 000 ₽ + the card's chip amount); tapping it again switches it
  off and moves the slider back to the value it had below 7 000 000 ₽ before (owner, 2026-10-16; see Calculations).
- «Доп. опции»: sticky bottom panel with chips and the button. Turning an option on recolours its chips (green, as
  the pledge card) and recalculates the panel chips. «Предоставить выписку» (до +10 000 000 ₽) only paints the
  amount chip green. Turning off the «Все включено» package (КН) raises the payment and recolours the payment
  chip. The pledge chosen on the offer changes the colour and value of the ОК fee chip.
- Documents: 1 док → «Нужны фото СТС» with «Получить деньги» → success. 2 дока → «Загрузите документы» → upload
  screen with «Загрузить», which returns (iOS pop) to «Загрузите документы» in the ready state (both chips
  «Загружено») → «Получить деньги» → success.
- «Проверка без опций» (no «Залог и условия» card) is shown when neither a pledge nor any option (package
  included) is on; its «Получить деньги» goes straight to success.

## Configuration (query parameters)

`src/config.ts` reads `location.search` once: `product` = `kn` | `ok` (default `kn`), `pledge` = `auto` |
`realty` | `both` (default `auto`), `docs` = `one` | `two` (default `one`). Unknown values fall back to the
default. The hash route is separate (`#/options`), so URLs look like `/p/credit-activation/v2/?product=ok&pledge=both&docs=two#/options`.
The viewer reloads the iframe when the choice changes; the prototype never writes these parameters.

Phones get no menu (ADR-0021). Open question for the owner (ledger): an in-prototype way to switch the variant
on phones; for now the URL parameters are the way.

## Calculations (`src/calc.ts`, pure functions, unit-tested in `test/calc.test.ts`)

- Slider: 4 000 000 … 9 000 000 ₽, step 100 000, initial 4 000 000. Pledge threshold = min + pledge chip
  (3 000 000) = 7 000 000.
- Total amount = slider + 2 000 000 if «Проверить данные» is on. «Предоставить выписку» changes no number.
- Slider memory (owner, 2026-10-16): the slider stays linear 4–9 млн. State keeps `sliderBelow`, the last slider
  value below 7 000 000 ₽ (initially 4 000 000, reset on «Закрыть»): every drag updates it while the value is
  below the threshold (`rememberBelow`); a pledge tapped on from below the threshold remembers the current value
  first, then animates to 7 000 000 ₽. Tapping the pledge off animates back to `sliderBelow`
  (`sliderAfterPledgeTap(on, remembered)`). If the pledge came on by dragging past 7 млн, tap-off returns to the
  last value below 7 млн seen during that drag.
- Monthly payment (owner, 2026-10-16): fixed 17 713,05 ₽ for any slider amount, pledge, «Проверить данные» and
  «Поддерживать оборот». Only КН with the «Все включено» package off pays more: a fixed 18 858,08 ₽, computed once
  from the earlier formula at its reference state (7 000 000 ₽, pledge on): 17 713,05 × annuity(19,5 %) /
  annuity(19,5 % × 0,85) over 60 months. ОК ignores the package. Formats: offer card «Платеж в месяц» and panel
  chip «17 713 ₽ / мес» rounded to rubles, review «17 713,05 ₽».
- ОК fee: 2,9 %; with a pledge 2,5 % (as drawn, although the chip says −0,5%); «Поддерживать оборот» −0,5 pp more
  (2,4 % without pledge, 2,0 % with). Display «2,9%» when unchanged, else «<s>2,9%</s> → 2,5%» with the new value
  in `--ds-text-positive` (see `01c-fee-active.png`).
- Chip colours (`tui-chip` in the panel, 32 px tall, radius full, padding 0 7 px, label ui-s-bold 13):
  neutral = `--ds-background-base` bg, `--ds-text-primary` label and icon; positive = `--ds-status-positive-pale`
  bg, `--ds-text-positive` label and icon.
  - amount chip (₽ icon): positive when the total is above the slider amount or «Предоставить выписку» is on;
  - payment chip (arrow icon): КН positive while the package is on; ОК positive while a pledge is selected;
    otherwise neutral;
  - fee chip (% icon, ОК only): positive when the fee is below 2,9 %, else neutral, value = current fee.
- Badges inside cards (`tui-badge`, 28 px tall, radius full, padding 0 6 px, icon 16 px + label ui-s-bold with 4 px
  padding): off = `--ds-background-neutral-2` bg, `--ds-text-primary` icon and label; on = `--ds-status-positive-pale`
  bg, `--ds-text-positive`.

## Screens and routes

Routes: `#/` offer, `#/options`, `#/review`, `#/sts` (1 док), `#/documents` (2 дока), `#/upload` (2 дока), `#/success`.
Default path (deep links build the stack from it): `#/ → #/options → #/review → (#/sts | #/documents → #/upload)
→ #/success`; a deep link to `#/success` with two docs skips `#/upload`. Next targets:

- offer «Дальше» → options; options «Дальше» → review;
- review «Дальше» (with pledge/options) → `#/sts` or `#/documents`; «Проверка без опций» «Получить деньги» → success;
- `#/sts` «Получить деньги» → success;
- `#/documents` yellow «Получить деньги»: not ready → push `#/upload`; ready → push success. The «Загрузить»
  badges on its cards also push `#/upload`;
- `#/upload` «Загрузить» → mark documents uploaded and pop back (the documents page re-renders its ready state
  before the pop animation starts, so it is visible while sliding in).

Navigation therefore no longer is "a prefix of FLOW": rework `nav.ts` so the stack holds screens by route,
`history.state = { i }` still indexes the stack, each `Screen` gets `next(): string | null` (route to push, may
depend on state) and an optional `refresh(root)` called on the page below before it is uncovered (pop, drag start).
Keep everything else from v1 (see Navigation below).

### `#/` Offer (`01-*`)

Top: status bar, app bar with «Закрыть» on the left (no back). Content (no large title):

- «Одобрили кредит» / «ИП Константинопольский К.&nbsp;К.» heading-s centred (tui-header, pt 12);
- amount numbers-2-xl centred (live), slider 343 wide (track 12 px `--ds-component-progress-bar`, value
  `--ds-background-accent-2`, 5 ticks, 24 px white knob with the small shadow), labels «4 000 000 ₽» / «9 000 000 ₽»
  body-m secondary. Keep the v1 slider markup and `--progress`;
- info cards row (16 px gap, 20 px top, neutral-1 bg, radius 16, py 12): «Срок 5 лет ›» and
  - КН: «Платеж в месяц <payment> ›»;
  - ОК: «Комиссия <fee>» (no chevron) and below it a full-width card «Платеж в месяц <payment> ›»;
- pledge cards (`tui-card-large`, white `--ds-background-elevation-1`, radius 24, shadow medium, 20 px top gap,
  card header padding 16 16 12 20): title heading-m «Под залог авто» / «Под залог недвижимости» (wraps), on the
  right a 22 px tooltip button «?» (neutral-1 circle, v1 `tooltip-question.svg`) and the radio (22 px;
  `radio-normal.svg` / `radio-selected.svg` + `check-ios.svg` mask), 16 px gap; description body-l
  «Mercedes-Benz W214» / «Москва, ул. Лесная, 27, кв. 263»; badges row (4 px gap, padding 0 20 20 20): «₽ +3 000 000 ₽»,
  «% −0,5%». `pledge=both`: realty card first, auto second; radio picks one at a time (tapping the other card moves
  the selection; tapping the checked one switches it off). Whole card is the control: `role="checkbox"` (one pledge)
  or radios in a `radiogroup` with a deselectable checked radio (two) — keyboard Space/Enter toggles, focus ring.
  Pledge on/off animates the slider value and the amount text with `@proto/motion` (fast, productive).
- sticky bottom block «Дальше» (no fade needed when content is short; keep v1 bottomBlock).

### `#/options` «Выберите улучшения условий» (`02-*`)

Top bars with back + «Закрыть»; large title heading-mobile-l «Выберите улучшения условий» (padding 8 16). Cards
(20 px top, 20 px between, same card-large style as pledge cards, header «title + ? + radio», description body-l,
badges):

- КН only, first: «Пакет «Все включено»» checked by default; content: 3 rows with a green check
  (`check-medium.svg`, positive) and body-l text «Ставка ниже на 15% — сэкономите 10 541 ₽», «Бесплатное
  обслуживание счета для бизнеса», «Без комиссии за досрочное погашение»; footer secondary button «Изменить пакет»
  (visual only). No badges.
- «Проверить данные» / «Обычно занимает до 1 рабочего дня» / badge «₽ +2 000 000 ₽».
- «Поддерживать оборот» / «По счету для бизнеса в Т‑Банке от 46 789 ₽/мес» / badge «% −0,5%».
- «Предоставить выписку» / «По счетам из других банков» / badge «₽ до +10 000 000 ₽».
  Each card toggles (checkbox semantics, radio look as in the design). Sticky bottom panel: background
  `--ds-component-tab-bar-background` with `backdrop-filter: blur(25px)`, 0.5 px top divider `--ds-border-normal`,
  pt 16, chips row (4 px gap, centred), 16 px gap, «Дальше» button, home indicator. Content ends 32 px above the
  panel.

### `#/review` «Проверьте, все ли верно» (`03-*`)

As v1 review, plus: «Сумма и платеж» rows «Сумма <total>», «Платеж в месяц <payment with kopecks>», ОК adds
«Комиссия <fee display>»; footer «График платежей». «Залог и условия» card lists what is on, in this order, each
an avatar row (40 px `--ds-status-info-pale` circle, 24 px icon): pledge auto → `transport-auto.svg`
«Mercedes-Benz W214» / «Понадобится фото СТС»; pledge realty → `doc.svg` «Москва, ул. Лесная, 27, кв. 263» /
«Понадобится выписка ЕГРН»; «Проверить данные» → `doc.svg` «Проверка данных» / «Обычно занимает до 1 рабочего
дня»; «Поддерживать оборот» → `briefcase.svg` «Оборот по счету в Т‑Банке» / «От 46 789 ₽/мес»; «Предоставить
выписку» → `doc.svg` «Выписка из другого банка» / «Обычно проверяем за 2 минуты»; package → `briefcase.svg`
«Пакет «Все включено»» / «Документы не потребуются»; footer «Как это работает». Then «Рублевый счет / Изменить /
Куда поступят деньги». Bottom: «Дальше». Without anything on: no «Залог и условия» card, button «Получить деньги»
and the legal text below it (`03b-review-no-options.png`).

### `#/sts` «Нужны фото СТС, чтобы получить деньги» (`04a`) — v1 documents screen, button «Получить деньги».

### `#/documents` «Загрузите документы» (`04b`, `05`)

Large title (pt 12, pb 24), two cards (20 px gap): «Фото СТС авто» / «Mercedes-Benz W214, О 7 *** Р» and
«Гарантийное письмо» / «Загрузите бухгалтерские карточки, сформированные в 1С» (description body-m secondary);
a badge button «Загрузить» (neutral-1 bg, `--ds-text-action`, ui-s-bold) or, when ready, a positive badge
«Загружено». Footer: «Получить деньги» + legal text below («Нажимая «Получить деньги», вы соглашаетесь <u>с
условиями</u>. Они доступны до 16 сентября»).

### `#/upload` (`04c`) — the v1 documents screen («Нужны фото СТС…», bullets, «Образцы обеих сторон СТС», «Выберите

файлы») with the button «Загрузить».

### `#/success` (`06`) — v1 success, amount = total.

## Platform and frame

- `<html data-ds-platform="ios">` so typography tokens resolve to the iOS scale (SF Pro → `-apple-system`
  fallback; SF Pro is never embedded). Use `--ds-typography-*` tokens: heading-mobile-l (30/36 bold), heading-
  mobile-m (20 bold), heading-mobile-s (17 semibold), body-l (17), body-m (15), ui-s (13), numbers-2-xl (48,
  rounded family `--ds-font-font-family-rounded-i-os-value`, bold), ui-2-xs-bold (11) for the badge. Check
  each token's resolved value; where the iOS block lacks one, compose from `--ds-font-*` primitives.
- The app always fills its window (`100dvh`): the viewer draws the iPhone mockup (ADR-0020). Remove v1's own
  centred 375 × 812 "device" for wide screens (`.claude/rules/prototypes.md`).
- Every screen is its own vertical scroll container with three layers:
  1. top bars, `position: sticky; top: 0`: mock iOS status bar (44 px: `status-time.svg` at left 34 px,
     `status-signal-wifi.svg` + `status-battery.svg` at right; vertically centred, +1 px) and the app bar
     (44 px). Background `--ds-component-navigation-bar-background` with `backdrop-filter: blur(20px)` so
     content scrolls under it like iOS.
  2. content.
  3. bottom block, `position: sticky; bottom: 0`: the yellow button (+ legal text where present) and the mock
     home indicator (34 px tall, 133 × 5 px bar, radius full, `--ds-background-accent-opposite`, 8 px from the
     bottom). Above the button a 24 px fade from transparent to `--ds-background-base` (TUI
     floating-container), so content scrolling under it fades out.
  - The end of the scrollable content sits exactly 32 px above the top of the bottom block (button, or legal
    text when it is above the button).

## Shared components (build once, reuse)

- **App bar** (44 px): left slot = back chevron (`back-ios-alt.svg` used as a mask, colour `--ds-text-action`,
  12 × 24 box at left 8 px, glyph 11.4 × 20 offset 2 px) or the text action «Закрыть»; right slot = «Закрыть»
  (body-l, `--ds-text-action`, padding-right 16 px). Hit areas ≥ 44 × 44.
- **Primary button (large)**: full width inside 16 px side padding, `--ds-appearance-primary-background-normal`
  (yellow), radius 16 px (`--ds-radius-l`), padding 16 px, label body-l `--ds-text-primary-on-accent-1`.
  States: hover → `…-background-hover`, active/pressed → `…-background-pressed` plus `transform: scale(0.98)`
  (fast duration), focus-visible ring `--ds-border-focus`. `<button type="button">`.
- **Primary button (medium)** (success screen): radius 12 px, padding 10 px, label body-m, label padding 3/8 px.
- **Secondary button (medium)**: `--ds-background-neutral-1`, radius 12 px, padding 10 px, label body-m
  `--ds-text-action`; hover/pressed via the matching neutral state tokens (pick from `--ds-appearance-*` or
  `--ds-state-*`; record which in the ledger).
- **iOS switch**: 51 × 31, radius full, off track `--ds-background-neutral-3`, knob 27 px white
  (`--ds-background-elevation-1`… or `--ds-color-white-white`) with the system shadow, 2 px inset; on → track
  positive/green status token, knob slides 20 px. Real `<input type="checkbox" role="switch">`, toggles with
  a short transition.
- **Radio (iOS)**: 22 px; selected = `radio-selected.svg` with `check-ios.svg` mask in
  `--ds-text-primary-on-dark` on top; normal = `radio-normal.svg`.
- **Card-large**: radius 24 px.

## Navigation (native iOS feel)

- A navigation stack keyed by route. `location.hash` is the source of truth; pushes use
  `history.pushState`, so the browser/OS back also pops. Loading a deep link builds the stack from the default path
  (see Screens and routes), so back still works.
- **Push**: the new screen slides in from the right (translateX 100 % → 0) above the current one, which moves
  to −30 % and dims (overlay up to ~10 % black); the incoming screen has a soft left-edge shadow. **Pop** is
  the exact reverse. Duration ≈ 0.5 s with an iOS-like curve — use `@proto/motion` (`duration.slow` /
  `'ds-expressive-standard'` or the closest token; record the choice). Both screens stay interactive-safe
  (ignore taps during the transition).
- **Back**: the app-bar chevron and the browser back pop. **Interactive edge swipe**: a pointer/touch drag
  that starts within 20 px of the left edge of the device moves the top screen with the finger (previous
  screen parallax −30 % → 0, dimming fades); release past 50 % width or with a fast rightward flick
  completes the pop, otherwise it animates back. Disabled on `#/` and `#/success`. Use pointer events with
  `touch-action: pan-y` on screens.
- «Закрыть» (any screen): close the flow → animate the current screen down/fade and reset to `#/` with an empty
  stack (state reset to initial). On `#/` it only resets state.
- «К счету»: same reset as «Закрыть». Browser back on `#/success` also resets (the application is submitted).
- **No forward navigation** (as in iOS): browser forward onto an entry of the flow is undone
  (`history.go` back to the current entry), so forward entries left after a pop or a reset never re-enter the
  flow with reset state. A hash typed by hand (no history state) still pushes the stack up to that screen.
- `prefers-reduced-motion`: replace slides with a short cross-fade; the swipe still works without parallax.
- Scroll positions of screens below the top one are preserved when popping back.

## Out of scope (ledger questions)

- In-prototype variant switch on phones (no menu there, ADR-0021).
- Real behaviour behind «Срок», «Платеж в месяц», «?», «Изменить пакет», «График платежей», «Как это работает»,
  «Изменить», «Образцы обеих сторон СТС» — visual only, as in v1.
- Documents for the realty pledge: the design only has СТС and «Гарантийное письмо»; used for every variant.
