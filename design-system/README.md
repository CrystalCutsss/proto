# design-system

Mirror of Google Drive Proto/DS (read-only forever) and what is derived from it. Filled in Phase 2b (ADR-0013):
Figma sources (`*.fig`) stay in Drive and are only tracked in the lock; tokens come from the Variables export
the owner puts into `Proto/DS/tokens/`.

| Path | What | Written by |
|---|---|---|
| `source/` | Copy of Proto/DS without `*.fig` (e.g. `source/tokens/*.tokens.json`) | `ds-sync` workflow only (ADR-0008) |
| `source.lock.json` | md5 / modified time of every DS file, copied or not | `ds-sync` |
| `inventory.json` | Inventory of Proto/DS | `drive-inventory` |
| `manifest.json`, `references/` | Map of DS components and reference images | Later: the DS has only `.fig` sources, no component data |

Tokens are normalized at build time by `packages/tokens` (Figma export → DTCG 2025.10 → `--ds-*`); see its README.
