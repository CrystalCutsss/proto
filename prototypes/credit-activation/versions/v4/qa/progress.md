# credit-activation v4 — progress ledger

Task: new version «Кредит, условия и тарифы» of «Единая активация» from Figma «Plauground»
(`FyEnitMAmvWmNU9At6rjc4`, section «V5» `73:23561`, 4 screens). Spec: `spec/spec.md`. Base: v3
(`pnpm proto:version credit-activation`).

Owner decisions (2026-10-25): КН / ОК menu axis; after «Проверка условий» the v2 fork (pledge → documents);
«Тарифы» only from «Кредит» and only in КН; the chosen tariff drives the payment, tariffs in a horizontal slider.

## Figma calls (2026-10-25)

`get_metadata` 73:23561 · `get_screenshot` 73:23561 · `get_design_context` 73:22831, 73:22591, 73:22711, 73:22577
(6 calls).

## Steps

| Step             | Status | Notes                                                                                                                                                        |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0. Prepare       | done   | `pnpm proto:version credit-activation` (base v3)                                                                                                             |
| 0b. Figma intake | done   | references in `design-input/figma/`; icons `close-ios26`, `back-ios26`, `close-ios`, `plus`, `check-pragmatic`, `check-small`, `calendar-small`, `hint-tail` |
| 1. Spec          | done   | `spec/spec.md`                                                                                                                                               |
| 2. Build         | done   | main session: `credit`, `conditions` + `wheel.ts`, `tariffs`, shared transition in `nav.ts`                                                                  |
| 3. Review        | done   | see `visual-qa.md`                                                                                                                                           |
| 4. Visual QA     | done   | `qa:diff` 2,5–4,1 % (font: no SF Pro in Linux Chromium); flows КН / ОК in Playwright                                                                         |
| 5. Finish        | done   | PR                                                                                                                                                           |
