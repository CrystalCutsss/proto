// Assemble dist/site from built packages (ADR-0012):
//   /               apps/hub/dist (index.html, compare.html, assets/)
//   /_shell/        packages/proto-shell/dist
//   /p/<slug>/<vN>/ prototypes/<slug>/versions/<vN>/dist (frozen versions: copied from .frozen/site by their build)
//   /registry.json, /robots.txt, /_headers
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { serializeRegistry } from '@proto/registry';

/** Workers Free plan limit is 20 000 static files per version (ADR-0006); warn early. */
export const FILE_WARN_LIMIT = 18000;

/** @param {string} dir @returns {{ files: number, bytes: number }} */
export function countFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countFiles(p);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += statSync(p).size;
    }
  }
  return { files, bytes };
}

/**
 * @param {string} repoRoot
 * @param {string} out
 * @param {import('@proto/registry').Registry} registry
 */
export function assembleSite(repoRoot, out, registry) {
  /** @type {string[]} */
  const problems = [];
  const need = (/** @type {string} */ dir, /** @type {string} */ what) => {
    if (!existsSync(join(dir, 'index.html')) && !existsSync(join(dir, 'loader.js'))) {
      problems.push(`${what} is not built (${dir})`);
      return false;
    }
    return true;
  };
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const hub = join(repoRoot, 'apps/hub/dist');
  if (need(hub, 'apps/hub')) cpSync(hub, out, { recursive: true });
  const shell = join(repoRoot, 'packages/proto-shell/dist');
  if (need(shell, 'packages/proto-shell')) cpSync(shell, join(out, '_shell'), { recursive: true });

  for (const p of registry.prototypes) {
    for (const v of p.versions) {
      const dist = join(repoRoot, 'prototypes', p.slug, 'versions', v.version, 'dist');
      const what = `${p.slug} ${v.version}`;
      if (!need(dist, what)) continue;
      const html = readFileSync(join(dist, 'index.html'), 'utf8');
      if (!html.includes(`content="${v.version}"`) || !html.includes('/_shell/loader.js')) {
        problems.push(
          `${what}: index.html has no shell loader or version meta — is vite.config.ts using defineVersionConfig()?`,
        );
        continue;
      }
      if (!html.includes(`/p/${p.slug}/${v.version}/`) && /<script[^>]+src="\/(?!_shell)/.test(html)) {
        problems.push(`${what}: assets are not under base /p/${p.slug}/${v.version}/`);
        continue;
      }
      cpSync(dist, join(out, 'p', p.slug, v.version), { recursive: true });
    }
  }
  if (problems.length)
    throw new Error(`site:build cannot assemble the site:\n  - ${problems.join('\n  - ')}`);

  writeFileSync(join(out, 'registry.json'), serializeRegistry(registry));
  writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  // Static-host fallback; on Cloudflare the Worker sets the same headers itself (ADR-0006).
  writeFileSync(
    join(out, '_headers'),
    [
      '/*',
      '  X-Robots-Tag: noindex, nofollow',
      '  X-Content-Type-Options: nosniff',
      '  Referrer-Policy: same-origin',
      '  Cache-Control: private, no-cache',
      '/assets/*',
      '  Cache-Control: private, max-age=31536000, immutable',
      '/p/*/assets/*',
      '  Cache-Control: private, max-age=31536000, immutable',
      '',
    ].join('\n'),
  );
  return countFiles(out);
}

/** Write registry.json again after previews were added. @param {string} out @param {unknown} registry */
export const writeRegistry = (out, registry) =>
  writeFileSync(join(out, 'registry.json'), serializeRegistry(registry));
