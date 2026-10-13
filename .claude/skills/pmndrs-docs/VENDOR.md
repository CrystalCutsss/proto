# Vendored: pmndrs-docs

| | |
|---|---|
| Source | https://github.com/pmndrs/claude-code-plugin — `skills/docs/` (and `.mcp.json`) |
| Commit | `9ec2934e40d3211730b980e4c148cedad4ec7465` |
| Vendored | 2026-10-13 (ADR-0007, reviewed in full: instructions only, no scripts) |
| Licence | MIT (LICENSE, Copyright (c) 2026 Poimandres) |
| Files | `SKILL.md`; server entry in the project `.mcp.json` |

## Local changes
- Renamed `docs` → `pmndrs-docs`; description in the project format.
- Rewritten for the current server, which added `search_docs` (checked with `tools/list` on 2026-10-13); the index-first flow of the upstream text is kept as a fallback rule (never guess paths).
- Added a fallback for sessions where the project MCP server is not loaded (r3f llms.txt; drei.docs.pmnd.rs is blocked by the VM network).
- The upstream `examples` skill is not vendored: `get_example` is described here.
