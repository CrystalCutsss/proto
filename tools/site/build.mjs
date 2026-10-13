#!/usr/bin/env node
// pnpm site:build [--skip-build] [--no-previews] [--out dist/site]
// Builds hub, shell and every version with Turborepo (frozen versions only copy their snapshot), then
// assembles the static site and registry.json. Invalid metadata fails the build before anything runs.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { buildRegistry, RegistryError } from '@proto/registry';
import { assembleSite, FILE_WARN_LIMIT, writeRegistry } from './lib/assemble.mjs';
import { takePreviews } from './lib/previews.mjs';

const repoRoot = join(import.meta.dirname, '../..');
const { values } = parseArgs({
  options: {
    'skip-build': { type: 'boolean', default: false },
    'no-previews': { type: 'boolean', default: false },
    out: { type: 'string', default: 'dist/site' },
  },
});
const out = join(repoRoot, values.out);
const started = performance.now();

let registry;
try {
  registry = buildRegistry(repoRoot);
} catch (err) {
  console.error(err instanceof RegistryError ? err.message : err);
  process.exit(1);
}

if (!values['skip-build']) {
  const filters = ['--filter=@proto/hub', '--filter=@proto/proto-shell'];
  for (const p of registry.prototypes)
    for (const v of p.versions) filters.push(`--filter=@proto/${p.slug}--${v.version}`);
  const res = spawnSync('pnpm', ['turbo', 'run', 'build', ...filters], { cwd: repoRoot, stdio: 'inherit' });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

try {
  const { files, bytes } = assembleSite(repoRoot, out, registry);
  if (!values['no-previews']) {
    const { taken, skipped } = await takePreviews(out, registry);
    if (skipped) console.warn(`previews skipped: ${skipped}`);
    else console.log(`previews: ${taken}/${registry.prototypes.length}`);
    writeRegistry(out, registry);
  }
  const versions = registry.prototypes.reduce((n, p) => n + p.versions.length, 0);
  console.log(
    `site: ${registry.prototypes.length} prototypes, ${versions} versions, ${files} files, ` +
      `${(bytes / 1024 / 1024).toFixed(1)} MiB → ${values.out} in ${((performance.now() - started) / 1000).toFixed(1)} s`,
  );
  if (files > FILE_WARN_LIMIT) {
    console.warn(
      `::warning::${files} files: close to the Workers Free limit of 20 000 files (ADR-0006). Plan the move to Workers Paid.`,
    );
  }
} catch (err) {
  console.error(/** @type {Error} */ (err).message);
  process.exit(1);
}
