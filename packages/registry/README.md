# @proto/registry

- `schemas/prototype.schema.json`, `schemas/version.schema.json` — JSON Schema 2020-12 for metadata.
- `buildRegistry(repoRoot)` → `registry.json` object; throws `RegistryError` listing every problem (file + JSON pointer).
- `validateMetadata(kind, data)` — validate a single file (hooks, editors).

CLI: `pnpm registry:validate`, `pnpm registry:build`.
