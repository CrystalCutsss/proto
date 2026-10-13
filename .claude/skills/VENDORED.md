# Vendored third-party files (ADR-0007)

Every file here was read in full before it was copied. Licence, commit and local changes are in each
`VENDOR.md`. Updates go in a separate PR with the upstream diff from the old commit and a fresh review.

| Path | Source | Commit | Licence | Local changes |
|---|---|---|---|---|
| `skills/gsap-core/` | greensock/gsap-skills | `aed9cfd` | MIT | short description, promotional text removed, project note |
| `skills/gsap-timeline/` | greensock/gsap-skills | `aed9cfd` | MIT | short description, project note |
| `skills/gsap-scrolltrigger/` | greensock/gsap-skills | `aed9cfd` | MIT | horizontal-scroll example fixed, short description, project note |
| `skills/gsap-performance/` | greensock/gsap-skills | `aed9cfd` | MIT | short description, project note |
| `skills/gsap-react/` | greensock/gsap-skills | `aed9cfd` | MIT | pnpm install section, short description, project note |
| `skills/r3f-fundamentals/` | EnzeD/r3f-skills | `4a11805` | MIT (README) | short description, project note |
| `skills/r3f-loaders/` | EnzeD/r3f-skills | `4a11805` | MIT (README) | short description, project note |
| `skills/r3f-animation/` | EnzeD/r3f-skills | `4a11805` | MIT (README) | short description, project note |
| `skills/r3f-shaders/` | EnzeD/r3f-skills | `4a11805` | MIT (README) | short description, project note |
| `skills/r3f-postprocessing/` | EnzeD/r3f-skills | `4a11805` | MIT (README) | short description, project note |
| `skills/pmndrs-docs/`, `.mcp.json` | pmndrs/claude-code-plugin | `9ec2934` | MIT | renamed, rewritten for the current server tools, network fallback |
| `hooks/vendor/block-dangerous-commands.cjs` | karanb192/claude-code-hooks | `3c9c90a` | MIT | logging and entry point removed; patterns unchanged |
| `hooks/vendor/protect-secrets.cjs` | karanb192/claude-code-hooks | `3c9c90a` | MIT | logging and entry point removed; patterns unchanged |

Ideas only (no code copied): obra/superpowers (subagent-driven development, verification before completion,
description rule), wshobson/agents (file ownership, block-no-verify — ported in `hooks/bash-guard.mjs`),
VoltAgent surgeon-reviewer, anthropics webapp-testing.

Not vendored after review: other gsap-skills (frameworks, plugins, utils — not needed yet), other r3f-skills
(geometry, materials, lighting, textures, interaction, physics — later, on demand), pmndrs `examples` skill
(covered by `pmndrs-docs`).
