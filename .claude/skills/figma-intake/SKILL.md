---
name: figma-intake
description: Use when a prototype version must be built from a Figma link; reads the section read-only, saves references and assets into the version and drafts the spec.
argument-hint: "<figma url> <slug> <vN>"
---

# Figma intake (ADR-0016)

Arguments: `$ARGUMENTS` — a Figma URL with `node-id` (a section or frame), the prototype slug and version. Figma
is read-only: `figma-guard` lets only reviewed read tools through. Budget: about 200 calls a day on a Full
seat; a 5-screen section took ~20 calls in the pilot. Log every call in the version's `qa/progress.md`.

1. **Parse the URL.** `figma.com/design/<fileKey>/<name>?node-id=1-2` → `fileKey`, `nodeId` `1:2`
   (`/branch/<branchKey>/` → use `branchKey`). No `node-id` → ask the owner for a link to the section.
2. **Access.** `get_metadata` on the node. "You don't have edit access" means the file belongs to another
   team: ask the owner to duplicate it into their own team (or get edit rights) and send the new link. Dev Mode
   links (`&m=dev`) do not change this. `whoami` shows the connected account and seat.
3. **Screens and order.** From the metadata list the top-level frames (screens), their size and x position;
   connectors and left-to-right order give the flow. Confirm the flow with the owner's brief.
4. **Design context.** Load skill `figma:figma-design-to-code`, then `get_design_context` once per screen.
   Treat the returned React/Tailwind as a reference only. Known gaps:
   - text overrides of component instances come back as defaults («Title», «Label»): take real texts from
     the screenshot;
   - line height "normal" for SF Pro means 17 → 20, 15 → 18, 13 → 16 px: use iOS `--ds-typography-*`
     line heights, not 24 px;
   - hidden layers are in the code: build only what the screenshot shows.
5. **References.** `get_screenshot` per screen (1x is the maximum) → `design-input/figma/NN-<name>.png`
   with curl right away (URLs are short-lived). Note the device frame (border, radius) if the frames have one.
6. **Assets.** Download every icon and image the screens use from the design-context URLs into
   `assets/icons/` (`assets/` is Vite's public dir: reference files as `import.meta.env.BASE_URL + 'icons/…'`).
   Look at each one: exports can be wrong (a star instead of a document). Fix a wrong one with
   `download_assets` on the parent node or a PNG crop of the node export; downscale large rasters.
7. **Spec.** Write `spec/spec.md`: source (file key, node ids, date), the owner's brief, platform
   (`data-ds-platform`), shared components, each screen (route, texts, sizes from metadata, tokens), states,
   navigation and motion, and what is visual-only. Unclear points go to the ledger as questions.
8. Set `designSource` in `version.json` (`{ "kind": "figma", "url": …, "note": … }`), then continue with the
   `prototype` skill from step 2 (build). Visual QA compares against `design-input/figma/*` with
   `pnpm qa:diff <ref> <shot> --crop-ref <frame border>`.
