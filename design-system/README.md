# design-system

Mirror of Google Drive Proto/DS (read-only forever) and what is derived from it. Filled in Phase 2b.

| Path | What | Written by |
|---|---|---|
| `source/` | Copy of Proto/DS | `ds-sync` workflow only (ADR-0008) |
| `source.lock.json` | md5 / modified time of every source file | `ds-sync` |
| `inventory.json` | Inventory of Proto/DS | `drive-inventory` |
| `tokens/*.tokens.json` | DTCG tokens; `packages/tokens` builds them instead of its fixture | Phase 2b |
| `manifest.json`, `references/` | Map of DS components and reference images | Phase 2b |
