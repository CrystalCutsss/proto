# design-system

Mirror of Google Drive Proto/DS (read-only forever) and what is derived from it. Filled in Phase 2b (ADR-0013):
Figma sources (`*.fig`) stay in Drive and are only tracked in the lock; tokens come from the Variables export
the owner puts into `Proto/DS/tokens/`.

| Path | What | Written by |
|---|---|---|
| `source/` | Copy of Proto/DS without `*.fig` (e.g. `source/tokens/*.tokens.json`) | `ds-sync` workflow only (ADR-0008) |
| `source.lock.json` | md5 / modified time of every DS file, copied or not | `ds-sync` |
| `inventory.json` | Inventory of Proto/DS | `drive-inventory` |
| `tokens/*.tokens.json` | Figma export normalized to DTCG 2025.10; `packages/tokens` builds them instead of its fixture | Phase 2b |
| `manifest.json`, `references/` | Map of DS components and reference images | Phase 2b |
