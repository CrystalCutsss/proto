---
name: verify
description: Use when about to claim work is done, commit or open a PR; runs the project's checks and reports their fresh output.
---

# Verify

No fresh output, no "done". Run the checks that cover the change, read the output, then report.

1. Always (about a minute):
   ```
   pnpm lint
   pnpm typecheck
   pnpm test
   ```
2. If prototypes, packages that prototypes use, the hub, the shell or `tools/site` changed:
   ```
   pnpm site:build && pnpm test:e2e
   ```
3. If `.github/workflows/` changed: actionlint and zizmor as described in the Drive setup doc; otherwise skip.
4. If the change is visual: look at a screenshot (agent `visual-qa`, or a Playwright screenshot you read).

Report as a list: command → pass/fail, plus the first error lines for any failure. Fix failures you caused and
re-run; for failures you did not cause, show that they also fail on `origin/main` and say so. Never skip,
disable or loosen a test, lint rule or hook to get green.
