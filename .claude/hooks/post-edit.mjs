#!/usr/bin/env node
// PostToolUse checks after Edit / Write / MultiEdit (ADR-0014). Feedback goes back to Claude, the edit stays.
//   - *.css → Stylelint with proto/ds-tokens: design values only through var(--ds-*) (ADR-0013);
//   - prototype.json / version.json → registry validation (schemas, routes, versions; ADR-0009).
// The tool already ran, so a failed check returns {"decision":"block","reason":…} for Claude to fix.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectDir, readEvent, repoPath } from './lib/repo.mjs';

/**
 * Which checks apply to a repository path.
 * @param {string | null} rel
 * @returns {('stylelint' | 'registry')[]}
 */
export function checksFor(rel) {
  if (!rel || /(^|\/)(node_modules|dist|\.frozen)\//.test(rel)) return [];
  const checks = /** @type {('stylelint' | 'registry')[]} */ ([]);
  if (/\.css$/.test(rel)) checks.push('stylelint');
  if (/^prototypes\/[^/]+\/(prototype\.json|versions\/v[1-9][0-9]*\/version\.json)$/.test(rel)) {
    checks.push('registry');
  }
  return checks;
}

/** @param {string} root @param {'stylelint' | 'registry'} check @param {string} rel */
function run(root, check, rel) {
  const [cmd, args] =
    check === 'stylelint'
      ? [join(root, 'node_modules/.bin/stylelint'), [rel, '--formatter', 'compact']]
      : [process.execPath, ['tools/proto-cli/cli.mjs', 'registry', '--check']];
  if (check === 'stylelint' && !existsSync(cmd)) return null; // dependencies not installed yet
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: 25_000 });
  if (r.status === 0) return null;
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().slice(0, 4000);
  return check === 'stylelint'
    ? `Stylelint failed for ${rel}. Use semantic tokens var(--ds-*) from @proto/tokens instead of raw values:\n${out}`
    : `Registry validation failed after editing ${rel}:\n${out}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = await readEvent();
  const root = projectDir(event);
  const rel = repoPath(root, event.tool_input?.file_path);
  const problems = checksFor(rel)
    .map((check) => run(root, check, /** @type {string} */ (rel)))
    .filter(Boolean);
  if (problems.length) process.stdout.write(JSON.stringify({ decision: 'block', reason: problems.join('\n\n') }));
}
