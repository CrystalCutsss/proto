# main — QA notes

Source: Figma `FyEnitMAmvWmNU9At6rjc4`, frame `main` (22:842); buttons and card header are TUI `tui-button`
and `tui-header [card]`; the menu control is TUI `tui-segmented` (24:991).

Values without a TUI or project token (local custom properties, as `.claude/rules/tokens-css.md` asks):

- Title «Proto Stand / B2B Loans»: T-Sans Bold 96/80 is not a TUI text style (`--hub-title-size`,
  `--hub-title-line`; scales down with the viewport).
- Card radius 40 px (`--hub-card-radius`); the project scale stops at `--ds-radius-xl`.
- Card fill: the design has white 8 %; the closest semantic token is `--ds-background-neutral-1-on-dark`
  (white 10 %).
- `tui-segmented`: track inset 2 px and item radius 10 px (`packages/ui/src/segmented.css`).
- Stage black: the design uses `tui/background/accent-opposite` (Day) = black; in the night theme the same
  black is `--ds-background-accent-on-light`.
- Card rim: the cards carry Figma's Glass effect, which the Figma code export drops. `.hub-card::before` draws
  it as a 1 px rim: `--ds-background-neutral-3-on-dark` on the top edge, `--ds-background-neutral-2-on-dark` on
  the bottom, none on the sides (measured on the 22:850 render: +58 / +42 over the fill).
