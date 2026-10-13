# @proto/tokens

Design tokens in DTCG format → `dist/tokens.css` (`--ds-*`), `dist/tokens.js`, `dist/tokens.d.ts`.

- Source: `design-system/tokens/**/*.tokens.json` after DS sync (Phase 2b); until then `fixtures/` (synthetic).
- Use in CSS only through `var(--ds-…)`; Stylelint rejects hard-coded design values.
