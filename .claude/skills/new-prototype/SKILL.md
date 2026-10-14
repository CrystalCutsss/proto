---
name: new-prototype
description: Use when the user asks to start a new prototype; scaffolds prototypes/<slug> with v1 from a template via the proto CLI.
argument-hint: "<slug> [vanilla-ts|three-gsap|react-r3f] [title]"
---

# New prototype

Arguments: `$ARGUMENTS` (slug, optional template, optional title). Ask only for what you cannot infer.

1. **Slug:** lowercase latin words joined by single hyphens (`checkout-flow`), unique under `prototypes/`.
2. **Template:**
   - `vanilla-ts` — screens, forms, UI flows;
   - `three-gsap` — three.js scene + GSAP, no React;
   - `react-r3f` — React Three Fiber scenes or React-heavy UI.
3. **Create:** `pnpm proto:new <slug> --template <template> --title "<Russian title>" --description "<one line>"`.
   It writes `prototype.json`, `versions/v1/` and runs `pnpm install` (the lockfile changes; that is expected).
4. **Metadata:** set `tags` in `prototype.json`. In `versions/v1/version.json` fill `title`, `changelog` and
   `routes`. If a Figma link or Drive inbox path exists, record it in `designSource`.
5. **Design input:** if the owner has files in Drive `Proto/Inbox/<slug>/v1/`, ask them to run the
   `drive-inbox` workflow (inputs: slug, v1). The session never downloads them itself. Input that arrived
   before the prototype existed (`prototypes/<slug>/versions/v1/design-input/` only) is kept by `proto:new`.
6. **Check:** `pnpm registry:validate` and `pnpm --filter @proto/<slug>--v1 build`. Quote the result.
7. **Commit** on the session branch: `feat(<slug>): new prototype from <template>`.

Next step: build the screens with the `prototype` skill.
