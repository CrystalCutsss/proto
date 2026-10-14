# credit-activation v1 — spec

Source: Figma file `FyEnitMAmvWmNU9At6rjc4` (owner's copy of «Единая активация»), section `0:5447`
«Тест прототипа», read through the Figma MCP connector on 2026-10-14. Reference renders (1x, frame incl. a
4 px black device border and 40 px corner radius that are NOT part of the UI): `design-input/figma/0N-*.png`.
Assets exported from Figma: `assets/icons/*`.

Owner's brief (verbatim intent):

- PWA: web scaled to the mobile breakpoint, 375 × 812 px.
- Flow: screens left to right, advanced by the yellow buttons. Buttons react to hover and press.
- Yellow buttons are sticky, like the iOS system bars. Distance from the button block to the end of the content
  is 32 px.
- Back works like native iOS: returns to the previous screen with the native animation.
- Transitions between screens work like native iOS (push / pop).

## Platform and frame

- `<html data-ds-platform="ios">` so typography tokens resolve to the iOS scale (SF Pro → `-apple-system`
  fallback; SF Pro is never embedded). Use `--ds-typography-*` tokens: heading-mobile-l (30/36 bold), heading-
  mobile-m (20 bold), heading-mobile-s (17 semibold), body-l (17), body-m (15), ui-s (13), numbers-2-xl (48,
  rounded family `--ds-font-font-family-rounded-i-os-value`, bold), ui-2-xs-bold (11) for the badge. Check
  each token's resolved value; where the iOS block lacks one, compose from `--ds-font-*` primitives.
- Viewport ≤ 500 px wide: the app fills the screen (`100dvh`). Wider: a centered 375 × min(812 px, 100dvh)
  "device" with `--ds-radius-*` corners and a soft shadow on a neutral page background.
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

## Screens and routes (flow order)

### 1. `#/` — «По умолчанию» (offer) — ref `01-offer.png`

- App bar: left «Закрыть» (body-l action, padding-left 16 px). No back.
- Header (padding-top 12 px, 16 px sides, centred, heading-mobile-s): «Одобрили кредит» / «ИП
  Константинопольский К. К.» (two lines).
- 24 px gap, amount: «8 000 000 ₽» numbers-2-xl rounded bold, centred, padding-bottom 10 px.
- Slider (44 px tall, 16 px sides): track 12 px, radius 12 px, `--ds-component-progress-bar`; fill
  `--ds-background-accent-2` from the left; 5 ticks (`slider-tick.svg`, 4 px) spread with 8 px inner padding;
  knob 24 px white circle with the small shadow. Labels under it (body-m `--ds-text-secondary`): «4 000 000 ₽»
  left, «9 000 000 ₽» right.
  - Interactive: range 4 000 000…9 000 000, step 100 000, initial 8 000 000; the amount text updates
    (thin-space grouping like «8 000 000 ₽»). Use a native `<input type="range">` styled to match (keyboard
    accessible). The chosen amount is shared state used on screens 3 and 5.
- Info cards (padding-top 20 px, 16 px sides, gap 16 px), bg `--ds-background-neutral-1-on-light`, radius
  16 px, padding 12 px 16 px 12 px 12 px; caption ui-s secondary, title heading-mobile-s primary, 4 px gap:
  - row of two: «Срок» / «5 лет» with `chevron-right-small.svg` (16 px, mask, `--ds-text-secondary`, top
    right with 4 px padding); «Комиссия» / «2,9%» without chevron.
  - full width: «Платеж в месяц» / «193 500 ₽» with chevron.
    (Chevron cards are visual only in v1.)
- Options card (24 px top margin, 16 px sides): `--ds-background-elevation-1`, radius 24 px, medium shadow
  (0 6 34 black 12 %), padding-bottom 4 px. Header «Опции» heading-mobile-m (padding 16 20 12). Rows (px
  4 + 16, min-height 56, gap 16, text padding 8): title heading-mobile-s, description ui-s secondary, switch
  on the right (vertically aligned to a 40 px box):
  1. «+1 000 000 ₽» + badge «−0,4% комиссия» (`--ds-status-positive-pale` bg, `--ds-text-positive`, 11 px
     bold, radius full, padding 1.5 px 4 px) / «Залог авто Mercedes-Benz W214».
  2. «+100 000 ₽» / «За выписку из другого банка»; accessory: tooltip button 22 px circle
     `--ds-background-neutral-1` with `tooltip-question.svg`, then the switch (gap 16 px).
  3. «До +2 000 000 ₽» / «За дополнительный залог авто» + line break + «или недвижимости».
- Bottom block: button «Дальше» → push `#/conditions`.

### 2. `#/conditions` — «Подбор условий» — ref `02-conditions.png`

- App bar: back + «Закрыть».
- Large header «Выберите условия» heading-mobile-l, padding 8 16 20.
- Plan cards (16 px sides, gap 20 px), bg `--ds-background-neutral-1-on-base`, radius 24 px. Card header
  (min-height 56, padding 16 16 12 20): title heading-mobile-m «… ₽ в месяц», description body-m secondary,
  radio at the top right (padding-top 8). Rows (padding-right 4; each row px 16, icon box 24 px with
  `check-medium.svg` or `cross-medium.svg` centred, 16 px gap, text body-l primary, 8 px vertical padding);
  card bottom padding ≈ 12 px:
  1. «17 713 ₽ в месяц» / «С пакетом «Все включено»» — ✓ «Ставка ниже на 15% — сэкономите 10 541 ₽»,
     ✓ «Бесплатное обслуживание счета для бизнеса», ✓ «Без комиссии за досрочное погашение». Selected.
  2. «21 029 ₽ в месяц» / «С пакетом «Универсальный»» — ✓ «Ставка ниже на 10% — сэкономите 4 432 ₽»,
     ✕ «Бесплатное обслуживание счета для бизнеса», ✓ «Без комиссии за досрочное погашение».
  3. «23 029 ₽ в месяц» / «Без пакета» — ✕ «Снижение ставки», ✕ «Бесплатное обслуживание счета для
     бизнеса».
  - The whole card is a radio option (`role="radiogroup"`); tapping selects it (single choice), keyboard
    arrows work.
- Bottom block (fade + button): «Дальше» → push `#/review`.

### 3. `#/review` — «Активация» (check) — ref `03-review.png`

- App bar: back + «Закрыть».
- Large header (padding 8 16): «Проверьте, все ли верно» heading-mobile-l, line-height 36, wrapping as
  «Проверьте, / все ли верно»; description «Условия доступны до 16 декабря 2026» body-l primary (6 px gap).
- 12 px gap, cards (16 px sides, gap 20 px), bg `--ds-background-base`, radius 24 px, medium drop shadow:
  1. «Сумма и платеж» (heading-mobile-m, padding 16 20 12). Rows (px 4+16, text padding 8, min-height 56):
     «Всего» / «<amount>» (shared amount), «Платеж в месяц» / «20 851,05 ₽» (caption ui-s secondary, title
     body-l). Footer (padding 0 20 20): secondary button «График платежей».
  2. «Залог и условия». Rows with a 40 px avatar (`--ds-status-info-pale`, icon 24 px centred):
     `transport-auto.svg` «Mercedes-Benz W214» / «Понадобится фото СТС»; `doc.svg` «Выписка из другого
     банка» / «Обычно проверяем за 2 минуты» (title body-l, description ui-s secondary). Footer: secondary
     button «Как это работает».
  3. «Рублевый счет» with a right link «Изменить» (body-l action) and subheader «Куда поступят деньги»
     (body-m secondary); padding-bottom 16 px.
- Bottom block: legal text (ui-s secondary, centred, line-height 18, 16 px sides) «Нажимая «Получить
  деньги», вы соглашаетесь с условиями. Они доступны до 16 декабря», 12 px gap, button «Дальше» → push
  `#/documents`.

### 4. `#/documents` — «Проверка условий» (STS photos) — ref `04-documents.png`

- App bar: back + «Закрыть».
- Large header «Нужны фото СТС, чтобы получить деньги» heading-mobile-l / 36, padding 8 16 24.
- Bullet list (items padding 8 16, gap 12; bullet `bullet-accent.svg` 6 px with padding-top 7 px; text
  body-l): «Загрузите фото обеих сторон СТС»; «Убедитесь, что документ виден полностью, текст хорошо
  читается, нет бликов и посторонних предметов».
- 4 px gap, disclosure cell (px 16): 56 px avatar, radius 12 px, `sts-sample.jpg` (object-fit contain);
  title «Образцы обеих сторон СТС» body-l; trailing `chevron-right-service.svg` 7 × 16 as mask in
  `--ds-text-tertiary`. Visual only in v1.
- File input (343 px, 16 px sides): 1 px `--ds-background-accent-2` border, radius 12 px, padding 16 px, label
  «Выберите файлы» body-m `--ds-text-action` centred, line-height 24; below (4 px gap) hint «Файлы jpg, png,
  heif, heic не больше 10 МБ» ui-s secondary, line-height 20. It is a real `<label>` + hidden
  `<input type="file" multiple accept=".jpg,.jpeg,.png,.heif,.heic,image/*">`; after choosing, list the file
  names under the hint (ui-s primary). Hover/pressed: light `--ds-status-info-pale` fill.
- Bottom block (fade): button «Получить деньги» → push `#/success`; under the button (min-height 48, 16 px
  sides, centred ui-s secondary) «Нажимая «Получить деньги», вы соглашаетесь с условиями. Они доступны до 16
  сентября» with «с условиями» underlined.

### 5. `#/success` — «Успех» — ref `05-success.png`

- Status bar + empty app bar (no back: the application is submitted; the back gesture is disabled here).
- Status block centred vertically: `coins-check.svg` 128 px, 24 px gap, title «Зачисляем <amount> на счет»
  heading-mobile-s, 8 px gap, text «Обычно это занимает несколько минут.» / «Когда закончим, пришлем СМС»
  body-m secondary (centred, max-width 290), 24 px gap, medium primary button «К счету» (not sticky).
- «К счету» → resets the flow to `#/` (replace history, see navigation).
- Home indicator at the bottom (white bar background).

## Navigation (native iOS feel)

- A navigation stack keyed by route. `location.hash` is the source of truth; pushes use
  `history.pushState`, so the browser/OS back also pops. Loading a deep link builds the stack from the flow
  order (screens before it), so back still works.
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
- «К счету»: same reset as «Закрыть».
- `prefers-reduced-motion`: replace slides with a short cross-fade; the swipe still works without parallax.
- Scroll positions of screens below the top one are preserved when popping back.

## Out of scope for v1 (ledger questions)

- Large-title collapse into the nav bar on scroll (native iOS behaviour, not in the design).
- Real behaviour behind «Срок», «Платеж в месяц», tooltip, «График платежей», «Как это работает»,
  «Изменить», «Образцы обеих сторон СТС».
- Mock status bar on real phones (it duplicates the real one in a browser tab); kept for fidelity.
