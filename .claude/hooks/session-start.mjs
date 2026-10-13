#!/usr/bin/env node
// SessionStart (startup, resume) hook (ADR-0014):
//   - installs dependencies when node_modules is missing or older than pnpm-lock.yaml
//     (fast: the setup script warms the pnpm store, ADR-0001);
//   - adds a short orientation to the context: branch, install result, where STATUS lives.
// Never fails the session: problems are reported in the context instead.
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectDir, readEvent } from './lib/repo.mjs';

/** @param {string} root */
export function needsInstall(root) {
  const marker = join(root, 'node_modules', '.modules.yaml');
  const lock = join(root, 'pnpm-lock.yaml');
  if (!existsSync(lock)) return false;
  if (!existsSync(marker)) return true;
  return statSync(lock).mtimeMs > statSync(marker).mtimeMs;
}

/** @param {string} root */
function install(root) {
  const r = spawnSync('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 280_000,
  });
  if (r.status === 0) return 'dependencies installed (pnpm install --frozen-lockfile)';
  const tail = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-8).join('\n');
  return `pnpm install FAILED (exit ${r.status ?? r.signal}); run it manually before building:\n${tail}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = await readEvent().catch(() => ({}));
  const root = projectDir(event);
  const deps = needsInstall(root) ? install(root) : 'dependencies up to date';
  const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
  const context = [
    `proto session: branch ${branch || 'unknown'}; ${deps}.`,
    'Project state and next step: docs/STATUS.md → cloud STATUS in Proto/Docs (read it before starting phase work).',
  ].join('\n');
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } }),
  );
}
