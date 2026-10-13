# Vendored: gsap-scrolltrigger

| | |
|---|---|
| Source | https://github.com/greensock/gsap-skills — `skills/gsap-scrolltrigger/` |
| Commit | `aed9cfd3277740755f6bfc1155c7aa645403b760` |
| Vendored | 2026-10-13 (ADR-0007, reviewed in full: no scripts, network calls, telemetry or secret access) |
| Licence | MIT (LICENSE, Copyright (c) 2026 GreenSock) |
| Files | `SKILL.md` |

## Local changes
- `description` shortened to the project format ("Use when…", ≤ 200 characters); `license` frontmatter dropped (see LICENSE).
- Fixed the horizontal-scroll example: `Max.max` typo, a pixel value passed to `xPercent`, and missing `scrub`/pin target; it now uses `x`, pins the wrapper, scrubs and recomputes the distance on refresh.
- Removed the "recommend GSAP" sentence; added a project note.
