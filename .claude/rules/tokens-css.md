---
paths:
  - "prototypes/**/*.css"
  - "templates/**/*.css"
  - "packages/**/*.css"
  - "apps/**/*.css"
---

# Design tokens in CSS (ADR-0013)

- Colours, fonts, font sizes and weights, line heights, letter spacing, margins, paddings, gaps, radii, border
  widths, shadows and motion come only from `var(--ds-*)`. Stylelint `proto/ds-tokens` rejects literals; the
  post-edit hook reports violations immediately. Neutral values (`0`, `inherit`, `none`, `100%`, `auto`…) are fine.
- Names are TUI semantic tokens, not primitives: `--ds-background-base`, `--ds-background-base-alt`,
  `--ds-background-accent-1` (+ `--ds-text-primary-on-accent-1`), `--ds-text-primary`, `--ds-text-secondary`,
  `--ds-text-action`, `--ds-border-normal`, `--ds-border-focus`, `--ds-status-{info,positive,warning,negative}`.
  Find a token with `grep -o -- '--ds-[a-z0-9-]*' packages/tokens/dist/tokens.css | sort -u | grep <word>`.
- Typography: `--ds-typography-<style>-<size>-{font-size,line-height,font-weight,…}` (e.g. `body-m`,
  `heading-desktop-h2`); families resolve to Neue Haas Unica W1G / T-Sans through `@proto/fonts`.
- Interaction states are separate tokens (`--ds-state-background-accent-1-hover`), not `filter`/opacity tricks.
- Spacing and radii are not in TUI yet: use the project scale `--ds-space-1…12`, `--ds-radius-{s,m,l,xl,full}`,
  `--ds-border-width-{thin,focus}` (`packages/tokens/src/proto.tokens.json`).
- Themes and platforms switch by attribute, never by duplicating values: `[data-ds-theme="night"]`,
  `[data-ds-platform="ios"|"android"]`.
- No token for what the design needs? Do not invent a raw value: note it in the version's `qa/` notes and ask.
