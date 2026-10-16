---
paths:
  - "prototypes/**"
  - "templates/**"
---

# Prototypes and versions (ADR-0009 … ADR-0012, ADR-0020)

- Create prototypes and versions only with the CLI (`pnpm proto:new`, `pnpm proto:version`); never copy version
  folders by hand. A frozen version (`version.json` → `"status": "frozen"`) is immutable.
- Each version is a self-contained workspace package `@proto/<slug>--vN`: depend on workspace packages
  (`@proto/ui`, `@proto/motion`, `@proto/three-kit`) and exact npm versions; no CDN URLs anywhere.
- Keep `version.json` honest: `changelog` lists user-visible changes, `routes` lists every hash route (the menu
  keeps the route when switching versions), `scenarios` names the entry points of the viewer's «Сценарий» menu
  (`{ id, title, route }`, each route in `routes`; without it the menu shows «Основной»), `status` moves
  draft → review → frozen.
- Variants of one version (product, pledge, documents…) are menu `axes` in `version.json` (ADR-0022), not extra
  versions or scenarios: `[{ id, title, items: [{ id, title }] }]`, first item is the default. The viewer shows one
  captioned control per axis instead of «Сценарий / Версия» and passes the choice as `?<axis>=<item>`; read it
  from `location.search` once and fall back to the default for unknown values.
- `prototype.json` → `platform`: `mobile` (shown in the iPhone mockup on wide screens, full-screen on phones and as
  an installed web app) or `desktop` (default: the whole window, the design's own background, no frame).
- Mobile designs keep the system status bar and home indicator from the mockup, marked with
  `data-proto-system-bar`. The loader hides them where the device has its own (installed web app, phone screen):
  `:root[data-proto-bars='hidden']` is set, so pad the layout with `var(--proto-safe-area-inset-top)` /
  `var(--proto-safe-area-inset-bottom)` there (the loader maps them to `env()`; inside the viewer's iframe, where
  `env()` is 0, the viewer passes the phone's insets). Do not draw a
  device frame or centre a fixed-size "device" yourself: the viewer does it.
- Routing is hash-based (`#/settings`); the site serves each version at `/p/<slug>/vN/` (ADR-0012), so use
  relative asset URLs or `import.meta.env.BASE_URL`, never absolute `/…` paths.
- Inputs: `design-input/` (from the drive-inbox workflow or the owner), `spec/spec.json` (`pnpm proto:spec`).
  Output checks: `qa/` (screenshots, diffs, notes).
- The «Сценарий / Версия» menu is never shown on phone screens (ADR-0021): every state of a mobile prototype
  must be reachable inside the prototype itself. Menu axes are the exception: on phones the viewer shows a
  floating «Варианты» button that opens them in a sheet (ADR-0023).
- Do not import the menu or the viewer: the build-kit plugin injects the shell loader, which opens a version
  inside the viewer (`/p/<slug>/`); `?shell=0` shows the bare page (screenshots, debugging).
- Accessibility basics are part of done: semantic elements, focus states (`--ds-border-focus`), labels, and
  `prefers-reduced-motion` handled through `@proto/motion`.
