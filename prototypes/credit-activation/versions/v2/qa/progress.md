# credit-activation v2 — progress ledger

Task: new version of «Единая активация» from Figma «Plauground» (`FyEnitMAmvWmNU9At6rjc4`): scenarios КН / ОК,
pledge variants (авто / недвижимость / 2 залога) and documents (1 / 2) chosen in the viewer menu (menu axes,
query parameters), live slider / pledge / options / fee logic, two document flows. Spec: `spec/spec.md`.

## Steps

| Step         | Status  | Notes                                                                                           |
| ------------ | ------- | ----------------------------------------------------------------------------------------------- |
| 0. Prepare   | done    | `pnpm proto:version credit-activation` (base v1); references in `design-input/figma`, new icons |
| 1. Spec      | done    | `spec/spec.md`                                                                                  |
| 2. Build     | pending | prototype-builder                                                                               |
| 3. Review    | pending | code-reviewer                                                                                   |
| 4. Visual QA | pending | visual-qa                                                                                       |
| 5. Finish    | pending |                                                                                                 |

## Build (step 2)

Files: `src/config.ts`, `src/calc.ts`, `src/state.ts`, `src/nav.ts`, `src/components.ts`, `src/screens/*`
(`offer`, `options`, `review`, `sts`, `documents`, `upload`, `success`, shared `sts-content`), `src/style.css`,
`test/calc.test.ts`, `vitest.config.ts`; `package.json` gets `test` + `vitest` 5.0.4 (lock updated by `pnpm install`).
v1 `conditions` screen removed.

Decisions:

- **Calc.** КН rate = (20 % − 0,5 pp pledge − 0,5 pp оборот) × 0,85 with the package; ОК always 20 %. One scale
  factor per product, calibrated to 17 713,05 ₽ at 7 000 000 ₽ (КН: pledge + package). Payment rounded to kopecks.
  Fee kept in tenths of a percent (29 / 25 / −5) to avoid float drift. At 4 млн КН without a pledge the offer
  shows 10 215 ₽, ОК 10 122 ₽.
- **Slider ↔ pledge.** Slider ≥ 7 000 000 ₽ turns on the first card (2 залога: realty) if none is selected; below it
  turns the pledge off. Tap on (none selected) → slider to 7 000 000 ₽; tap on the checked card → off, slider −3 млн
  (min 4 млн); tap on the other card (2 залога) → the selection moves, the amount stays. The animation is a GSAP
  tween (`duration.fast`, `ds-productive-standard`) with `step="any"` on the range during the move so the thumb
  glides; the amount text counts in 100 000 ₽ steps.
- **Navigation.** The stack holds `Screen`s; `history.state.i` indexes it. `next()` returns the route to push;
  `refresh(root)` runs on the page below before a pop animation and at drag start (offer: payment/fee/cards;
  options: cards/chips; documents: badges). Deep links build the stack from `defaultPath()` in `screens/index.ts`
  (docs=`two` → `#/success` skips `#/upload`). A hand-typed hash pops to it if it is in the stack, otherwise pushes
  the default path from the current top (or just the screen), with one history entry per pushed screen (v1 created
  only one entry for several pages).
- **Upload.** `#/upload` «Загрузить» is `data-action="back"` plus `data-upload`; a new `Screen.beforeAction(control)`
  hook (called by nav only when the action is accepted, i.e. not during a transition) marks `docsUploaded`. Swipe
  or chevron back from `#/upload` does not mark. `docsUploaded` lives until «Закрыть» / «К счету».
- **Cards.** `card-large__control` (role `checkbox`, or `radio` inside `role="radiogroup"` for 2 залога, deselectable)
  holds header, description and badges; the «?» button and the package footer «Изменить пакет» are siblings
  positioned in the card, so no interactive element is nested. Space/Enter toggle, arrows move focus between the
  two pledge radios; the focus ring is drawn on the card (`:has(:focus-visible)`, `--ds-border-focus`).
- **Buttons.** Yellow: hover `--ds-state-background-accent-1-pressed` (the iOS `…-background-hover` token resolves to
  `null`, as in v1), pressed `--ds-appearance-primary-background-pressed` + `scale(0.98)`, focus-visible ring.
  Secondary: `--ds-state-background-neutral-1-hover` / `-pressed`. «Загрузить» badge button: neutral-1 with the same
  neutral-1 state tokens.
- **Review with conditions** has no legal text above «Дальше» (as drawn in `03-*`; v1 had one). The legal line keeps
  «с условиями» together with a non-breaking space.
- Package checks are `check-medium.svg` used as a mask in `--ds-text-positive` (the SVG has a raw green).
- Frame: v1's centred 375 × 812 device removed; `.app` fills the window.

Gaps (no token, provisional values kept from v1 and documented in `style.css`): medium card shadow, slider knob
shadow, pushed-screen edge shadow. Panel divider is `calc(var(--ds-border-width-thin) / 2)` (0,5 px, no token).
Chromium has no SF Pro: the fallback font is wider, so «Нужны фото СТС, чтобы получить деньги» wraps to 3 lines
in screenshots (2 in Figma), as in v1.

## Figma reading log (quota)

- 2026-10-16: `get_metadata` 3, `get_screenshot` 15, `get_design_context` 9 (2 for single icons, 1 failed on a
  component node outside the canvas). Total ≈ 27.
- Exports named «currency-rub» came back as a lock and a plus glyph, «doc» as a star; the right ₽ icon came from
  the badge icon instance `I42:2486;23657:461688;6917:52798`.

## Decisions (owner, 2026-10-16)

- Menu: one panel, three captioned segmented controls «Сценарий / Залог / Документы»; version and screen menus
  removed for this prototype (opt-in `axes` in version.json). Glow removed from the viewer for all prototypes.
- Numbers: formula calibrated to the design (17 713,05 ₽ at 7 000 000 ₽); ОК fee 2,9% → 2,5% as drawn.
- «Проверка без опций» only when no pledge and no option is on.

## Open questions

- Phones have no menu (ADR-0021): how should the variant be switched inside the prototype there?
- Documents for the realty pledge (design has only СТС and «Гарантийное письмо»).
- First-screen payment 193 500 ₽ in the design contradicts 17 713 ₽ later; the formula gives ≈ 10 000 ₽ at 4 млн.
