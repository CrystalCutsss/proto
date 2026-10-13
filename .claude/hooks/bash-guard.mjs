#!/usr/bin/env node
// PreToolUse guard for Bash (ADR-0014). Blocks, in this order:
//   1. catastrophic or destructive commands  — vendored block-dangerous-commands, level "high";
//   2. reading or exfiltrating secrets        — vendored protect-secrets, level "high";
//   3. skipping git hooks (--no-verify, core.hooksPath override)       — node port of wshobson block-no-verify;
//   4. direct Google Drive access from the VM — DS data reaches the repo only through GitHub Actions;
//   5. shell writes into Actions-only DS files or frozen versions;
//   6. a bare `git push` while the current branch is main (refspec forms are covered by permissions.deny).
// Regex guards are best effort; permissions.deny and CI (frozen-guard) are the hard layers.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ACTIONS_ONLY, block, frozenReason, frozenVersionOf, projectDir, readEvent, runGuard } from './lib/repo.mjs';

const require = createRequire(import.meta.url);
const dangerous = require('./vendor/block-dangerous-commands.cjs');
const secrets = require('./vendor/protect-secrets.cjs');

const NO_VERIFY = /\bgit\b[^;&|\n]*\s--no-verify\b|\bgit\s+(-c\s+\S+\s+)*-c\s+core\.hooksPath=/;
// Drive access = rclone as a command, or an HTTP client aimed at a Drive host. Checked per segment, so the
// same words inside a commit message or a file being written do not count.
const DRIVE_HOST = /\b(drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com|googleapis\.com\/(upload\/)?drive)\b/;
const COMMAND_PREFIX = String.raw`^\s*(?:[A-Za-z_]\w*=\S*\s+)*(?:(?:sudo|env|exec|timeout\s+\S+|xargs)\s+)*`;
const HTTP_CLIENT = new RegExp(`${COMMAND_PREFIX}(?:curl|wget|https?|xh|aria2c)\\b`);
const RCLONE = new RegExp(`${COMMAND_PREFIX}rclone\\b`);
/** @param {string} command */
const touchesDrive = (command) =>
  command
    .split(/&&|\|\||;|\||\n/)
    .some((s) => RCLONE.test(s) || (HTTP_CLIENT.test(s) && DRIVE_HOST.test(s)));
// Commands and redirections that create, change or delete files.
const WRITES =
  /(^|[^<>&0-9])>>?(?!&)|\btee\b|\bsed\s+(-[a-zA-Z]*\s+)*-i|\bperl\s+-[a-zA-Z]*i|\b(rm|mv|cp|ln|touch|truncate|install|rsync|unzip|tar|patch)\b|\bgit\s+(checkout|restore|rm|mv|apply|stash)\b|writeFile|appendFile/;
const PATHS = /(?:^|[\s'"=:(])(?:\.\/)?((?:prototypes|design-system)\/[^\s'";|&<>()]*)/g;

/**
 * Vendored dangerous-command patterns at level "high", tested per command segment: upstream regexes such as
 * rm-cwd use `.+` and otherwise match across `&&` (e.g. `rm -rf "$D" && find . -type f`). Pipes stay inside a
 * segment (curl … | sh); the fork bomb contains `;` and is tested on the whole command.
 * @param {string} command
 * @returns {{ id: string, reason: string } | null}
 */
function dangerousPattern(command) {
  const segments = command.split(/&&|\|\||;|\n/);
  for (const p of dangerous.PATTERNS) {
    if (dangerous.LEVELS[p.level] > dangerous.LEVELS.high) continue;
    const targets = p.id === 'fork-bomb' ? [command] : segments;
    if (targets.some((/** @type {string} */ s) => p.regex.test(s))) return p;
  }
  return null;
}

/**
 * @param {string} command
 * @param {{ root: string, branch?: () => string }} ctx
 * @returns {string | null} reason to block, or null
 */
export function evaluate(command, ctx) {
  if (!command) return null;
  const d = dangerousPattern(command);
  if (d) return `[${d.id}] ${d.reason}.`;
  const s = secrets.checkBashCommand(command, 'high');
  if (s.blocked) return `[${s.pattern.id}] ${s.pattern.reason}.`;
  if (NO_VERIFY.test(command)) return 'git hooks must not be skipped (--no-verify / core.hooksPath).';
  if (touchesDrive(command)) {
    return 'direct Google Drive access from the session is forbidden: DS data reaches the repo only through the ds-sync / drive-inbox workflows; docs go through the Drive connector (ADR-0004, ADR-0008).';
  }

  // Normalise absolute project paths so the path rules see repository-relative paths.
  const cmd = command.split(`${ctx.root}/`).join('');
  if (WRITES.test(cmd)) {
    for (const [, path] of cmd.matchAll(PATHS)) {
      const rel = path.replace(/\/+$/, '');
      if (ACTIONS_ONLY.some((re) => re.test(rel))) {
        return `${rel} is written only by GitHub Actions (ds-sync, ADR-0013); do not change it from the session.`;
      }
      const frozen = frozenVersionOf(ctx.root, rel);
      if (frozen) return frozenReason(frozen);
    }
  }

  if (/^\s*git\s+push\s*(-u\s+|--set-upstream\s+)?(origin\s*)?$/.test(command) && ctx.branch?.() === 'main') {
    return 'pushing main is forbidden (ADR-0002): work on a feature branch and open a PR.';
  }
  return null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runGuard('bash-guard', async () => {
    const event = await readEvent();
    const root = projectDir(event);
    const branch = () =>
      spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
    const reason = evaluate(event.tool_input?.command ?? '', { root, branch });
    if (reason) block('bash-guard', reason);
  });
}
