---
paths:
  - "prototypes/**"
  - "templates/**"
---

# Prototypes and versions (ADR-0009 … ADR-0012)

- Create prototypes and versions only with the CLI (`pnpm proto:new`, `pnpm proto:version`); never copy version
  folders by hand. A frozen version (`version.json` → `"status": "frozen"`) is immutable.
- Each version is a self-contained workspace package `@proto/<slug>--vN`: depend on workspace packages
  (`@proto/ui`, `@proto/motion`, `@proto/three-kit`) and exact npm versions; no CDN URLs anywhere.
- Keep `version.json` honest: `changelog` lists user-visible changes, `routes` lists every hash route (the version
  panel keeps the route when switching versions), `status` moves draft → review → frozen.
- Routing is hash-based (`#/settings`); the site serves each version at `/p/<slug>/vN/` (ADR-0012), so use
  relative asset URLs or `import.meta.env.BASE_URL`, never absolute `/…` paths.
- Inputs: `design-input/` (from the drive-inbox workflow or the owner), `spec/spec.json` (`pnpm proto:spec`).
  Output checks: `qa/` (screenshots, diffs, notes).
- Do not import the version panel: the build-kit plugin injects the shell loader.
- Accessibility basics are part of done: semantic elements, focus states (`--ds-border-focus`), labels, and
  `prefers-reduced-motion` handled through `@proto/motion`.
