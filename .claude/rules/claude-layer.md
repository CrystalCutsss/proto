---
paths:
  - ".claude/**"
  - "CLAUDE.md"
---

# Editing the Claude Code layer (ADR-0007, ADR-0014)

- Skill and agent descriptions start with "Use when…" and stay ≤ 200 characters; they are always in context.
  `pnpm test` runs `tools/claude-layer` checks on every SKILL.md, agent and rule.
- Manual procedures (freeze, release, ds-sync) set `disable-model-invocation: true`.
- Vendored files keep `VENDOR.md` (URL, SHA, licence, local changes) and a row in `.claude/skills/VENDORED.md`;
  updates go in a separate PR with the upstream diff and a fresh review.
- Hooks are Node ESM without dependencies, export a pure `evaluate()` for tests, fail closed
  (`onFailure: "block"`) and have tests in `.claude/hooks/*.test.mjs`.
- Conventions belong in `.claude/rules/` with `paths:`; skills are for procedures.
