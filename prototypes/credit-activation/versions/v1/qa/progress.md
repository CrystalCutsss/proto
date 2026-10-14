# credit-activation v1 — progress ledger

Task: Phase 6 pilot. Build the 5-screen «Единая активация» flow from Figma (owner's copy
`FyEnitMAmvWmNU9At6rjc4`, section `0:5447`) as an iOS-like PWA at 375 × 812 with sticky yellow buttons,
native-like push/pop transitions and an interactive back swipe. Spec: `spec/spec.md`.

## Steps

| Step                                      | Status       | Notes                                                                                           |
| ----------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| 0. Prepare (scaffold, assets, references) | done         | `pnpm proto:new credit-activation`; icons in `assets/icons`, references in `design-input/figma` |
| 1. Spec                                   | done         | `spec/spec.md`                                                                                  |
| 2. Build                                  | done         | prototype-builder: 5 screens, nav stack, swipe back; self-check shots in `qa/screens/`          |
| 3. Review                                 | done         | code-reviewer round 1 fixed (drag, forward, a11y); remaining: owner questions below             |
| 4. Visual QA                              | round 1 done | `qa/visual-qa.md`; fixes applied, diffs re-run (see round 1 below)                              |
| 5. Finish                                 | done         | review status; all checks + e2e green                                                           |

## Figma reading log (quota)

- `whoami` 1, `get_metadata` 1 (+2 failed on the original file, no edit access), `get_design_context` 5
  (+1 failed), `get_screenshot` 6. Total successful calls on the copy: 12.
- Text overrides of component instances come back as defaults («Title», «Label», «Header») in the generated
  code; real texts were taken from the rendered screenshots. Worth noting in ADR-0016.
- Reference renders are 1x only (`maxDimension` cannot upscale beyond the node size).

## Decisions

- Template `vanilla-ts`; no React.
- Fonts: `data-ds-platform="ios"`; SF Pro is not embedded, so Chromium on Linux renders the fallback (Inter)
  and pixel diffs will show text differences. Layout and colours are what the diff should judge.
- Slider is interactive (4–9 M, step 100 k); the amount flows into screens 3 and 5.

### Build (step 2)

- Modules: `src/nav.ts` (stack, history, swipe), `src/components.ts` (bars, buttons, switch, radio),
  `src/state.ts`, `src/icons.ts`, `src/screens/*.ts` (one per route), `src/style.css`.
- Icons are addressed as `BASE_URL + 'icons/…'`: build-kit sets `publicDir: 'assets'`, so files in `assets/`
  cannot be imported through Vite; they are copied as-is to `dist/icons/`. Monochrome glyphs (back, check,
  chevrons) are CSS masks coloured by tokens.
- History: entry `i` always shows `FLOW[i]` (`history.state.i`). A deep link rewrites the current entry to `#/`
  and pushes the flow up to the target, so both the chevron and browser back work. In-app pops call
  `history.back()`; the resulting popstate is a no-op. «Закрыть» / «К счету» call `history.go(-i)`. Forward
  navigation is blocked (as in iOS): popstate onto one of our entries with a higher index is undone with
  `history.go`, so entries left after a pop or reset never re-enter the flow with reset state; a hand-typed hash
  (no state) still pushes.
- Browser back on `#/success` behaves like «К счету» (reset to `#/`), because the application is already submitted.
- Motion: push/pop `duration.slow` (500 ms) + `ds-expressive-standard`; swipe release/cancel
  `ds-productive-entrance`, remaining-distance-proportional duration (min `duration.fast`); «Закрыть» slides the
  screen down with `ds-expressive-exit`. Parallax −30 %, dim overlay `--ds-color-black-black-alpha-10`.
- Reduced motion: `setupMotion()` fast-forwards the global timeline ×1000, so transitions would jump. The spec
  asks for a short cross-fade, so nav tweens compensate with `tween.timeScale(1 / globalTimeline.timeScale())`
  and fade over `duration.fast`. If the package policy should win, delete that line in `nav.ts`.
- Swipe: pointer events within 20 px of the left edge, 8 px slop, horizontal intent required; completes past
  50 % or with a rightward flick > 0.5 px/ms. Works with the mouse too (handy on desktop).
- Token choices (no exact semantic token): device shadow = TUI popup shadow; device corners `--ds-radius-xl` (24 px, the 40 px frame radius has no token);
  switch on = `--ds-status-positive`; secondary button hover/pressed = `--ds-state-background-neutral-1-hover/
-pressed`; text actions hover/pressed = `--ds-state-text-action-hover/-pressed`; file field hover =
  `--ds-status-info-pale`, pressed = `--ds-state-status-info-pale-pressed`.
- Medium buttons are 44 px tall like the render: secondary label line-height 24 (`--ds-font-line-height-x6`),
  primary «К счету» label 18 (`x4-5`) + padding 3/8. Review card footers get 12 px top padding (render) instead
  of 0 (spec). Legal texts use line-height 18 (`x4-5`), the ui-s token has 16.
- Status bar: `status-signal-wifi.svg` already contains the battery level at its right end; the battery outline
  is overlaid at +42 px (group 67 px, right 14 px, measured on the render).
- Amounts use NBSP grouping (Intl ru-RU), not thin spaces.

### Design/asset gaps found in step 2

- Fixed by the main session: `coins-check.svg` was the «magnifier» illustration; replaced by
  `assets/icons/coins-check.png` (Figma export of node `0:5674` at 3x, cropped to 256×256, shown at 128 px).
  `doc.svg` was a star; replaced by the real `tui-ic-medium / doc` glyph.
- With the fallback font (Inter) the documents title wraps into three lines (two in the render with SF Pro).

### Round 1 (review + visual QA)

- Primary hover: on iOS `--ds-appearance-primary-background-hover` and `--ds-state-background-accent-1-hover`
  resolve to transparent (iOS has no hover). Hover now uses `--ds-state-background-accent-1-pressed` (#ffcd33,
  the same value as the web hover `yellow-darker-60`); pressed = same colour + scale 0.98. Other state tokens
  checked in Chromium under iOS: neutral-1 hover/pressed, text-action hover/pressed, info-pale hover/pressed are
  all visible.
- Figma geometry: body-l / body-m use the iOS ui-l / ui-m line heights (20 / 18 = SF Pro "normal"); large button
  label keeps 24 (56 px button). `box-sizing: border-box` inside the device (min-heights include padding).
  Measured: info cards 72; plan cards 258 / 258 / 182; review header 96…210, first card 222, «Рублевый счет» 84;
  success gaps 24 / 8 / 24; options card 252 (header 52, rows 56 / 56 / 72, 4 px gaps, 4 px bottom) — Figma says
  260, the 8 px difference is unexplained by the listed parts.
- Desktop device is positioned with `round(down, …, 1px)` (x 532, y 44 at 1440×900).
- Mouse drag released outside the window: `pointermove` with `buttons === 0` and `lostpointercapture` cancel it.
- CSS transitions (buttons, switch, file field) are off under `prefers-reduced-motion`.
- Diff ratios (375×812, reducedMotion, `--crop-ref 4`), before → after: 01 12.99 → 11.71 %, 02 14.06 → 14.26 %,
  03 10.86 → 9.82 %, 04 6.65 → 6.57 %, 05 3.59 → 0.79 %. Top-aligned 01–03 are dominated by the taller Figma
  frames (bottom block sits lower) and fallback-font text.

## Open questions for the owner

- Missing TUI shadow tokens: medium card shadow (`0 6 34`, black 12 %), switch/slider knob shadow and the push
  edge shadow are composed from `--ds-space-*` with primitive colours `--ds-color-black-black-alpha-{6,10,12}`
  (marked `provisional` in CSS); the dim overlay also uses the primitive alpha 10. Add semantic tokens?

- Mock status bar / home indicator on a real phone: keep (fidelity) or hide in standalone/mobile?
- Large-title collapse on scroll: add in v2?
- What the secondary actions should open (tooltip, «График платежей», «Изменить», …).
- iOS Safari has its own edge-swipe back (browser history): it pops our stack through popstate without the
  interactive animation. Acceptable for a browser tab; in standalone PWA mode only our swipe is active.
- Browser back on the success screen resets the flow (like «К счету»): OK?
- Reduced motion: keep the short cross-fade (spec) or follow the package policy (instant)?
