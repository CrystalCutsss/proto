# Vendored: hooks from karanb192/claude-code-hooks

| | |
|---|---|
| Source | https://github.com/karanb192/claude-code-hooks — `plugins/block-dangerous-commands/`, `plugins/protect-secrets/` |
| Commit | `3c9c90a60ea7ec66964be6dff48e3db3b050ab4f` |
| Vendored | 2026-10-13 (ADR-0007, reviewed in full) |
| Licence | MIT, see `LICENSE-claude-code-hooks` |

## Review findings and local changes
- Upstream wrote every blocked command, with session ID and cwd, to `~/.claude/hooks-logs/*.jsonl`: removed.
- Upstream allowed the call on any internal error (fail open): the stdin entry point is removed; our guards
  (`bash-guard.mjs`, `file-guard.mjs`) call the exported checks and fail closed.
- Pattern lists and check functions are unchanged (verified with `diff`). We use level `high`.
- No network access, no child processes, no reads outside the tool input.
