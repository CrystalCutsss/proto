---
name: new-version
description: Use when a prototype needs a new version (changes after review, or the latest version is frozen); copies the latest version as a draft.
argument-hint: "<slug> [--from vN]"
---

# New version

Arguments: `$ARGUMENTS`.

1. Run `pnpm proto:list` and check the prototype exists. A frozen version is never edited; every change after
   freezing goes into a new version.
2. `pnpm proto:version <slug> [--from vN]` creates `versions/v<N+1>/` with `status: draft`, `baseVersion` set,
   and runs `pnpm install`.
3. Fill `version.json`: `title` (what this version is about), `changelog` (one line per user-visible change, in
   Russian), and update `routes` when screens are added or removed.
4. `pnpm registry:validate` and `pnpm --filter @proto/<slug>--v<N+1> build`; quote the result.
5. Commit: `feat(<slug>): v<N+1> draft`. Then implement the changes (skill `prototype`).

`prototype.json` → `defaultVersion` stays `latest` unless the owner asks to pin another version.
