# proto — Claude Code guide

Prototyping environment "Figma → code → password-protected hosting". Interactive web prototypes are built from
designs on the TUI design-system tokens, versioned, and published behind a password.

**Start here:** `docs/STATUS.md` points to the cloud STATUS in Google Drive (Proto/Docs). Read it before phase
work; it holds the current phase and the next step. ADRs live in Proto/Docs/ADR (index ID in `config/drive.json`).

## Hard rules

- **Google Drive DS folder is read-only forever.** Never write, rename, move, share or delete anything in it. DS
  data reaches the repo only through GitHub Actions (`ds-sync`, `drive-inbox`); the session never downloads DS
  content. Reading Drive metadata through the connector is fine.
- **Docs live in Proto/Docs** (Russian). Edit them through the Google Docs/Drive connectors; register every new
  document ID in `config/drive.json` (`drive-guard` enforces it). The repo keeps only pointers (`docs/STATUS.md`).
- **Secrets** exist only in GitHub Secrets and the hosting dashboard: never in the repo, env files or cloud
  environment variables.
- **Figma is not connected until Phase 8** and only on the owner's command.
- **Frozen versions are immutable** (ADR-0010). Make a new version with `pnpm proto:version <slug>`.
- `design-system/source/**`, its lock and inventory are written only by Actions. `pnpm-lock.yaml` changes only
  through pnpm.
- **main is changed only by the owner merging a PR** (ADR-0002). One phase = one branch = one PR; stop after the
  PR and wait for "go".
- **Third-party skills, agents and hooks** are vendored only after a full review, with license and SHA
  (ADR-0007, `.claude/skills/VENDORED.md`).
- Every significant decision gets an ADR. Docs are Russian; code, comments, commits, skill and agent texts are
  English.

Hooks in `.claude/hooks/` enforce most of this (fail closed). If a hook blocks you, follow its message; do not
work around it.

## Commands

```
pnpm install                       # SessionStart hook runs it when needed
pnpm proto:new <slug> [--template vanilla-ts|three-gsap|react-r3f] [--title "…"]
pnpm proto:version <slug> [--from vN]
pnpm proto:freeze <slug> <vN>      # owner-approved only
pnpm dev <slug> [vN]               # one version with the version panel
pnpm lint && pnpm typecheck && pnpm test
pnpm site:build && pnpm test:e2e   # whole site + Playwright smoke (Chromium preinstalled, 1.56.1)
pnpm registry:validate
```

## Layout

- `prototypes/<slug>/prototype.json`, `versions/vN/` — each version is a workspace package
  `@proto/<slug>--vN` with `version.json`, `design-input/`, `spec/`, `src/`, `qa/` (ADR-0009).
- `packages/` — `tokens` (TUI → `--ds-*`), `fonts`, `ui`, `motion` (GSAP), `three-kit`, `registry`,
  `site-router`, `build-kit`, `proto-shell`, `figma-bridge`.
- `apps/hub` — catalogue and version comparison. `templates/` — prototype templates.
- `tools/` — `proto-cli`, `site`, `drive`, `stylelint`. `config/` — Drive IDs, env placeholders.
- `infra/worker` + `wrangler.jsonc` — hosting Worker (password login, ADR-0015); `site:preview` runs the same
  handler, so test auth locally with `PROTO_PREVIEW_PASSWORD=… pnpm site:preview`.

## How to work

- **Prototypes:** use the skills `new-prototype`, `new-version`, `prototype` (spec → build → review → visual QA)
  and `verify`. Path-scoped conventions load from `.claude/rules/` when you touch matching files.
- **Design values only through tokens:** `var(--ds-*)` from `@proto/tokens` (TUI semantic names, e.g.
  `--ds-background-base`, `--ds-text-primary`). Stylelint `proto/ds-tokens` rejects raw colours, fonts and
  spacing; the post-edit hook reports violations right after an edit.
- **No CDNs:** fonts, decoders, HDRIs and assets are local files.
- **Verification before "done":** run the checks and quote their fresh output. No output, no claim.
- **Subagents:** `prototype-builder` (writes only under `prototypes/`), `code-reviewer` (read-only),
  `visual-qa` (screenshots and diffs). The main session owns shared packages, `.claude/` and docs.
- GitHub: `gh` works only through REST in this environment; use the GitHub MCP tools for PRs.
