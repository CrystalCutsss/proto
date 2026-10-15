// File operations behind proto:new, proto:version and proto:freeze. No process spawning here (testable).
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { hashTree } from '@proto/build-kit/frozen';
import { inboxOnly, RESERVED_SLUGS, SLUG_RE, VERSION_RE, versionNumber } from '@proto/registry';

export const TEMPLATES = ['vanilla-ts', 'three-gsap', 'react-r3f'];
/** Never copied between versions. */
const SKIP_ON_COPY = new Set(['node_modules', 'dist', '.frozen', '.turbo']);
const TEXT_EXT = /\.(json|ts|tsx|js|mjs|html|css|md|txt|svg)$/;

/** @param {string} msg */
const fail = (msg) => {
  throw new Error(msg);
};

export const today = () => new Date().toISOString().slice(0, 10);

/** @param {string} file */
export const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
/** @param {string} file @param {unknown} data */
export const writeJson = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

/** Escape a value inserted into template files (HTML, TS template strings). @param {string} s */
export const escapeValue = (s) => s.replace(/[&<>"'`$\\]/g, (c) => `&#${c.charCodeAt(0)};`);

/** @param {string} slug */
export function assertSlug(slug) {
  if (!slug || !SLUG_RE.test(slug) || slug.length > 64) {
    fail(
      `Invalid slug "${slug ?? ''}": use a-z, 0-9 and single hyphens, up to 64 characters (e.g. checkout-flow).`,
    );
  }
  if (RESERVED_SLUGS.has(slug)) fail(`Slug "${slug}" is reserved.`);
}

/** @param {string} version */
export function assertVersion(version) {
  if (!VERSION_RE.test(version ?? '')) fail(`Invalid version "${version ?? ''}": use v1, v2, …`);
}

/** @param {string} repoRoot @param {string} slug */
export function listVersions(repoRoot, slug) {
  const dir = join(repoRoot, 'prototypes', slug, 'versions');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => VERSION_RE.test(n))
    .sort((a, b) => versionNumber(a) - versionNumber(b));
}

/** @param {string} repoRoot @param {string} slug @param {string} version */
export const versionDir = (repoRoot, slug, version) =>
  join(repoRoot, 'prototypes', slug, 'versions', version);

/**
 * Copy a directory, replacing {{placeholders}} in text files.
 * @param {string} from @param {string} to @param {Record<string, string>} vars
 */
function copyTemplate(from, to, vars) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (SKIP_ON_COPY.has(entry.name)) continue;
    const src = join(from, entry.name);
    const dst = join(to, entry.name);
    if (entry.isDirectory()) copyTemplate(src, dst, vars);
    else if (TEXT_EXT.test(entry.name)) {
      const text = readFileSync(src, 'utf8').replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);
      writeFileSync(dst, text);
    } else cpSync(src, dst);
  }
}

/**
 * @param {string} repoRoot
 * @param {{ slug: string, template?: string, title?: string, owner: string, description?: string, platform?: string }} opts
 */
export function createPrototype(
  repoRoot,
  { slug, template = 'vanilla-ts', title, owner, description = '', platform = 'desktop' },
) {
  assertSlug(slug);
  if (!['mobile', 'desktop'].includes(platform))
    fail(`Unknown platform "${platform}". Available: mobile, desktop.`);
  if (!TEMPLATES.includes(template))
    fail(`Unknown template "${template}". Available: ${TEMPLATES.join(', ')}.`);
  const protoDir = join(repoRoot, 'prototypes', slug);
  if (existsSync(protoDir)) {
    // drive-inbox may have delivered versions/v1/design-input before the prototype was created: keep it.
    const versions = listVersions(repoRoot, slug);
    const inboxV1 = versions.length === 1 && versions[0] === 'v1' && inboxOnly(protoDir);
    if (!inboxV1) fail(`Prototype "${slug}" already exists: prototypes/${slug}/`);
  }
  const name = title || slug;
  const dir = versionDir(repoRoot, slug, 'v1');
  copyTemplate(join(repoRoot, 'templates', template), dir, {
    slug,
    version: 'v1',
    title: escapeValue(name),
  });
  writeJson(join(protoDir, 'prototype.json'), {
    $schema: '../../packages/registry/schemas/prototype.schema.json',
    title: name,
    description,
    owner,
    tags: [],
    status: 'active',
    platform,
    defaultVersion: 'latest',
    separatePassword: false,
  });
  writeJson(join(dir, 'version.json'), {
    $schema: '../../../../packages/registry/schemas/version.schema.json',
    version: 'v1',
    title: '',
    date: today(),
    author: owner,
    status: 'draft',
    changelog: [`Created from template ${template}`],
    baseVersion: null,
    designSource: null,
    routing: 'hash',
    routes: template === 'vanilla-ts' ? ['#/', '#/details'] : ['#/'],
  });
  return { dir, version: 'v1' };
}

/**
 * Copy an existing version (default: the latest) into the next version number as a draft.
 * @param {string} repoRoot
 * @param {{ slug: string, from?: string, author: string }} opts
 */
export function createVersion(repoRoot, { slug, from, author }) {
  assertSlug(slug);
  // A version folder without version.json holds only drive-inbox input for a version not created yet.
  const isCreated = (/** @type {string} */ v) =>
    existsSync(join(versionDir(repoRoot, slug, v), 'version.json'));
  const all = listVersions(repoRoot, slug);
  const versions = all.filter(isCreated);
  if (versions.length === 0) fail(`Prototype "${slug}" not found or has no versions.`);
  const source = from ?? /** @type {string} */ (versions.at(-1));
  assertVersion(source);
  if (!versions.includes(source))
    fail(`Version ${source} of "${slug}" does not exist. Available: ${versions.join(', ')}.`);
  const next = `v${versionNumber(/** @type {string} */ (versions.at(-1))) + 1}`;
  const srcDir = versionDir(repoRoot, slug, source);
  const dir = versionDir(repoRoot, slug, next);
  const inbox = existsSync(dir);
  if (inbox && !inboxOnly(dir)) fail(`${slug} ${next} already exists: prototypes/${slug}/versions/${next}/`);
  const stray = all.filter((v) => !isCreated(v) && v !== next);
  if (stray.length > 0) fail(`Unexpected inbox-only versions of "${slug}": ${stray.join(', ')}.`);
  cpSync(srcDir, dir, {
    recursive: true,
    filter: (src) => {
      const name = src.split(/[\\/]/).pop() ?? '';
      // Keep the new version's own design input when drive-inbox delivered it first.
      if (inbox && src === join(srcDir, 'design-input')) return false;
      return !SKIP_ON_COPY.has(name);
    },
  });

  const pkgFile = join(dir, 'package.json');
  const pkg = readJson(pkgFile);
  pkg.name = `@proto/${slug}--${next}`;
  // A frozen source has its build replaced by a snapshot copy: restore a normal build.
  if (pkg.scripts?.build === 'proto-frozen-build') {
    pkg.scripts.build = pkg.scripts['build:source'] ?? 'vite build';
    pkg.scripts.typecheck = pkg.scripts['typecheck:source'] ?? 'tsc -p tsconfig.json';
  }
  delete pkg.scripts?.['build:source'];
  delete pkg.scripts?.['typecheck:source'];
  writeJson(pkgFile, pkg);

  const vFile = join(dir, 'version.json');
  const meta = readJson(vFile);
  writeJson(vFile, {
    ...meta,
    version: next,
    title: '',
    date: today(),
    author,
    status: 'draft',
    changelog: [],
    baseVersion: source,
  });
  return { dir, version: next, from: source };
}

/**
 * Snapshot a built version: dist/ → .frozen/ with a manifest, status → frozen, build → snapshot copy (ADR-0010).
 * The caller must build the version first.
 * @param {string} repoRoot
 * @param {{ slug: string, version: string, commit: string }} opts
 */
export function freezeVersion(repoRoot, { slug, version, commit }) {
  assertSlug(slug);
  assertVersion(version);
  const dir = versionDir(repoRoot, slug, version);
  if (!existsSync(dir)) fail(`Version ${version} of "${slug}" does not exist.`);
  const vFile = join(dir, 'version.json');
  const meta = readJson(vFile);
  if (meta.status === 'frozen')
    fail(`${slug} ${version} is already frozen. Create a new version: pnpm proto:version ${slug}`);
  const dist = join(dir, 'dist');
  if (!existsSync(join(dist, 'index.html')))
    fail(`${slug} ${version} is not built: dist/index.html is missing.`);

  const frozen = join(dir, '.frozen');
  rmSync(frozen, { recursive: true, force: true });
  const tmp = `${frozen}.tmp`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(dirname(tmp), { recursive: true });
  cpSync(dist, join(tmp, 'site'), { recursive: true });
  const files = hashTree(join(tmp, 'site'));
  writeJson(join(tmp, 'manifest.json'), {
    schemaVersion: 1,
    prototype: slug,
    version,
    frozenAt: today(),
    sourceCommit: commit,
    fileCount: Object.keys(files).length,
    bytes: Object.keys(files).reduce((sum, f) => sum + statSync(join(tmp, 'site', f)).size, 0),
    files,
  });
  renameSync(tmp, frozen);

  const pkgFile = join(dir, 'package.json');
  const pkg = readJson(pkgFile);
  pkg.scripts = {
    ...pkg.scripts,
    build: 'proto-frozen-build',
    typecheck: 'proto-frozen-build --check',
    'build:source': pkg.scripts?.build ?? 'vite build',
    'typecheck:source': pkg.scripts?.typecheck ?? 'tsc -p tsconfig.json',
  };
  writeJson(pkgFile, pkg);
  writeJson(vFile, { ...meta, status: 'frozen' });
  return { frozen, fileCount: Object.keys(files).length };
}
