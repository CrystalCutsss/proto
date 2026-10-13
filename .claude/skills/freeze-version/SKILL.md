---
name: freeze-version
description: Use when the owner explicitly asks to freeze an approved prototype version; snapshots its build into .frozen/ (irreversible).
argument-hint: "<slug> <vN>"
disable-model-invocation: true
---

# Freeze a version (ADR-0010)

Arguments: `$ARGUMENTS`. Freezing is irreversible: the version's files can never change again. Run it only on
the owner's explicit request for this exact version.

1. Preconditions — stop and report if any fails:
   - the version's `status` is `review` (approved by the owner) and its `changelog` is complete;
   - `git status --short` is clean;
   - `pnpm --filter @proto/<slug>--<vN> typecheck` and `... build` pass.
2. `pnpm proto:freeze <slug> <vN>`: builds the version, writes `.frozen/site` with a SHA-256 manifest, sets
   `status: frozen` and switches the package's `build` script to `proto-frozen-build`.
3. `pnpm site:build` and `pnpm test:e2e`: the frozen version must still be served at `/p/<slug>/<vN>/`.
4. Commit `.frozen/`, `version.json` and `package.json` together: `chore(<slug>): freeze <vN>`.
5. Tell the owner: from now on, CI `frozen-guard` rejects any change to this version; new work goes into
   `pnpm proto:version <slug>`.
