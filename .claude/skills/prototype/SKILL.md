---
name: prototype
description: Use when building or changing screens of a prototype version from a brief, spec or design; runs spec → build → review → visual QA with subagents.
argument-hint: "<slug> <vN> <what to build>"
---

# Build a prototype version

Arguments: `$ARGUMENTS`. The main session orchestrates; subagents do focused work and communicate through files.

## 0. Prepare
- The version must exist and not be frozen (otherwise skill `new-version`).
- Ledger: `prototypes/<slug>/versions/<vN>/qa/progress.md` — the task, decisions, open questions and the
  status of each step. Create it now and update it after every step.

## 1. Spec
- Sources, in order: a Figma link (skill `figma-intake`: references, assets and `spec/spec.md`),
  `design-input/` images (run `pnpm proto:spec <slug> <vN>` → `spec/spec.json`), the owner's brief, the
  previous version.
- Write down screens, hash routes, states (empty, loading, error, hover/focus), responsive behaviour and motion.
  Unclear parts are questions in the ledger, not guesses. For a spike (exploring a look), say so and skip
  tests, but still verify the build.

## 2. Build — agent `prototype-builder`
Give it: slug, version, the spec path, the ledger path and the exact scope. One builder per version. Parallel
builders only for different versions (with `isolation: worktree`).

Run steps 3 and 4 in parallel (background agents): they find different classes of problems.

## 3. Review — agent `code-reviewer`
Give it the base ref and the intent. Blockers and should-fix items go back to the builder; at most two rounds.
After that, list what remains in the ledger and ask the owner.

## 4. Visual QA — agent `visual-qa`
Give it the routes, the viewport and the reference (design images or the previous version). It backs every
comparison with `pnpm qa:diff`. Merge its findings with the review into one fix list for the builder (screenshot
paths, exact sizes from Figma metadata where the spec and the render disagree), at most two rounds.

## 5. Finish
- Update `version.json` (`changelog`, `routes`; status `review` when the owner should look).
- Run skill `verify`, commit (`feat(<slug>): …`), and report: what was built, the checks with results, the
  screenshots, open questions.
