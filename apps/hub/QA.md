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
- Stage glow: the design's blurred ellipse (22:845) is a raster render, stored as pixel-identical lossless
  WebP (`packages/ui/src/assets/stage-glow.webp`; the layer's 25 % opacity is already in its alpha), centred
  657.5 px from the top.
- Title gradient: radial, centred at 50 % / 94.02 % of the text box, radii 121.96 % × 128.8 % (Figma 22:848).
- Stage black: the design uses `tui/background/accent-opposite` (Day) = black; in the night theme the same
  black is `--ds-background-accent-on-light`.
- Card rim: the cards carry Figma's Glass effect, which the Figma code export drops. `.hub-card::before` draws
  it as a 1.5 px rim (`--hub-card-rim`; the owner asked for it a little thicker than 1 px, as it looks in the
  design; between the `--ds-border-width-thin` and `-focus` tokens): `--ds-background-neutral-3-on-dark` on the top edge, `--ds-background-neutral-2-on-dark` on
  the bottom, none on the sides (measured on the 22:850 render: +58 / +42 over the fill).
