# @proto/tokens

Design tokens of the TUI design system (ADR-0013).

- **Source:** `design-system/source/tokens/*.tokens.json`, the Figma Variables export that the owner places in Proto/DS/tokens and `ds-sync` copies into the repository.
- **Own tokens:** `src/proto.tokens.json` covers what TUI does not define yet: spacing `--ds-space-*`, radii `--ds-radius-*` and border widths.
- **Output:**

  | File | Contents |
  |---|---|
  | `dist/tokens.css` | CSS variables `--ds-*` |
  | `dist/tokens.js`, `dist/tokens.d.ts` | Default values (Day, Desktop) |
  | `dist/dtcg/*.tokens.json` | Normalized DTCG 2025.10 trees |

- **Modes in `tokens.css`:**
  - `:root` is Theme Day + Platform Desktop;
  - `[data-ds-theme="night"]` switches the theme;
  - `[data-ds-platform="ios"|"android"]` switches platform-specific values (typography, some colors);
  - interaction states are separate tokens: `--ds-appearance-primary-background-hover`, `…-pressed`, `…-disabled`.
- **Use:** in CSS only through `var(--ds-…)`; Stylelint rejects hard-coded design values. Prefer semantic tokens (`--ds-background-*`, `--ds-text-*`, `--ds-border-*`, `--ds-status-*`, `--ds-typography-*`) over primitives (`--ds-color-*`).
- **Fonts:** TUI fonts (Neue Haas Unica W1G, T-Sans, SF Pro) are commercial and not part of the export. Font-family tokens fall back to Inter (bundled by `@proto/ui`) and system fonts.
