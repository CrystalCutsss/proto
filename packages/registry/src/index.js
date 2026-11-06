// Registry: validates prototypes/*/prototype.json and versions/*/version.json and builds registry.json,
// the single data source for the hub and the version switcher (ADR-0009, ADR-0012).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const VERSION_RE = /^v[1-9][0-9]{0,3}$/;
export const RESERVED_SLUGS = new Set(['compare', 'latest', 'assets', 'shell', 'registry']);

const schemaDir = new URL('../schemas/', import.meta.url);
const prototypeSchema = JSON.parse(readFileSync(new URL('prototype.schema.json', schemaDir), 'utf8'));
const versionSchema = JSON.parse(readFileSync(new URL('version.schema.json', schemaDir), 'utf8'));

// @ts-expect-error ajv's CJS default export is the class itself under NodeNext.
const ajv = new Ajv2020({ allErrors: true, strict: true, useDefaults: true });
// @ts-expect-error same CJS interop as above.
addFormats(ajv);
ajv.addSchema(versionSchema);
const validatePrototype = ajv.compile(prototypeSchema);
const validateVersion = ajv.getSchema(versionSchema.$id);

/** Thrown when metadata is invalid; `issues` lists every problem with file and JSON pointer. */
export class RegistryError extends Error {
  /** @param {import('./index.d.ts').RegistryIssue[]} issues */
  constructor(issues) {
    super(
      `Invalid prototype metadata (${issues.length} problem${issues.length === 1 ? '' : 's'}):\n` +
        issues.map((i) => `  - ${i.file}${i.pointer ? ` ${i.pointer}` : ''}: ${i.message}`).join('\n'),
    );
    this.name = 'RegistryError';
    this.issues = issues;
  }
}

/** Query parameters the loader and the viewer use themselves: never axis ids. */
export const RESERVED_AXES = new Set(['v', 's', 'bars', 'shell', 'proto-display', 'screen']);

/** Scenario listed for a version without `scenarios`: its start screen. */
export const DEFAULT_SCENARIO = { id: 'main', title: 'Основной' };

/** Numeric part of "vN". @param {string} v */
export const versionNumber = (v) => Number(v.slice(1));

/**
 * @param {string} file
 * @param {string} rel
 * @param {import('./index.d.ts').RegistryIssue[]} issues
 */
function readJson(file, rel, issues) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    issues.push({
      file: rel,
      pointer: '',
      message: `cannot read JSON: ${/** @type {Error} */ (err).message}`,
    });
    return undefined;
  }
}

/**
 * @param {import('ajv').ValidateFunction | undefined} validate
 * @param {unknown} data
 * @param {string} rel
 * @param {import('./index.d.ts').RegistryIssue[]} issues
 */
function schemaIssues(validate, data, rel, issues) {
  if (!validate || validate(data)) return true;
  for (const e of validate.errors ?? []) {
    let message = e.message ?? 'invalid';
    if (e.keyword === 'additionalProperties') message = `unknown property "${e.params.additionalProperty}"`;
    if (e.keyword === 'enum') message = `must be one of ${e.params.allowedValues.map(String).join(', ')}`;
    issues.push({ file: rel, pointer: e.instancePath || '/', message });
  }
  return false;
}

/**
 * Resolve the default version: explicit vN, or "latest" = highest non-draft, else highest.
 * @param {string} defaultVersion
 * @param {{ version: string, status: string }[]} versions sorted ascending
 */
export function resolveDefaultVersion(defaultVersion, versions) {
  if (defaultVersion !== 'latest') return defaultVersion;
  const ready = versions.filter((v) => v.status !== 'draft');
  return (ready.at(-1) ?? versions.at(-1))?.version ?? null;
}

/**
 * True when a folder holds only design input delivered by the drive-inbox workflow (every file sits under a
 * `design-input/` folder): the prototype or version is not created yet, so the registry skips it.
 * @param {string} dir
 * @returns {boolean}
 */
export function inboxOnly(dir) {
  /** @param {string} d @param {boolean} inside @returns {boolean} */
  const walk = (d, inside) =>
    readdirSync(d, { withFileTypes: true }).every((e) =>
      e.isDirectory() ? walk(join(d, e.name), inside || e.name === 'design-input') : inside,
    );
  return walk(dir, false);
}

/**
 * Scan the repository and build the registry. Throws RegistryError listing all problems.
 * @param {string} repoRoot
 * @returns {import('./index.d.ts').Registry}
 */
export function buildRegistry(repoRoot) {
  /** @type {import('./index.d.ts').RegistryIssue[]} */
  const issues = [];
  const protoRoot = join(repoRoot, 'prototypes');
  /** @type {import('./index.d.ts').RegistryPrototype[]} */
  const prototypes = [];
  const slugs = existsSync(protoRoot)
    ? readdirSync(protoRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name)
        .sort()
    : [];

  for (const slug of slugs) {
    const dir = join(protoRoot, slug);
    const rel = (/** @type {string} */ p) => relative(repoRoot, p).split('\\').join('/');
    const protoFile = join(dir, 'prototype.json');
    if (!SLUG_RE.test(slug) || slug.length > 64) {
      issues.push({
        file: rel(dir),
        pointer: '',
        message: 'folder name must be a slug: a-z, 0-9 and single hyphens',
      });
      continue;
    }
    if (RESERVED_SLUGS.has(slug)) {
      issues.push({ file: rel(dir), pointer: '', message: `"${slug}" is reserved` });
      continue;
    }
    if (!existsSync(protoFile)) {
      if (inboxOnly(dir)) continue;
      issues.push({ file: rel(protoFile), pointer: '', message: 'missing prototype.json' });
      continue;
    }
    const meta = readJson(protoFile, rel(protoFile), issues);
    if (meta === undefined || !schemaIssues(validatePrototype, meta, rel(protoFile), issues)) continue;
    const platform = meta.platform ?? 'desktop';
    if (meta.platforms && !meta.platforms.includes(platform)) {
      issues.push({
        file: rel(protoFile),
        pointer: '/platforms',
        message: `must include platform "${platform}"`,
      });
      continue;
    }

    const versionsDir = join(dir, 'versions');
    const names = existsSync(versionsDir)
      ? readdirSync(versionsDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
      : [];
    /** @type {import('./index.d.ts').RegistryVersion[]} */
    const versions = [];
    for (const name of names) {
      const vdir = join(versionsDir, name);
      const vfile = join(vdir, 'version.json');
      if (!VERSION_RE.test(name)) {
        issues.push({ file: rel(vdir), pointer: '', message: 'version folder must be named v1, v2, …' });
        continue;
      }
      if (!existsSync(vfile)) {
        if (inboxOnly(vdir)) continue;
        issues.push({ file: rel(vfile), pointer: '', message: 'missing version.json' });
        continue;
      }
      const v = readJson(vfile, rel(vfile), issues);
      if (v === undefined || !schemaIssues(validateVersion, v, rel(vfile), issues)) continue;
      if (v.version !== name) {
        issues.push({
          file: rel(vfile),
          pointer: '/version',
          message: `must equal the folder name "${name}"`,
        });
        continue;
      }
      if (v.baseVersion && versionNumber(v.baseVersion) >= versionNumber(name)) {
        issues.push({ file: rel(vfile), pointer: '/baseVersion', message: 'must be an earlier version' });
      }
      const pkgFile = join(vdir, 'package.json');
      const pkg = existsSync(pkgFile) ? readJson(pkgFile, rel(pkgFile), issues) : undefined;
      const expectedName = `@proto/${slug}--${name}`;
      if (!pkg) {
        issues.push({ file: rel(pkgFile), pointer: '', message: 'missing package.json' });
      } else if (pkg.name !== expectedName) {
        issues.push({ file: rel(pkgFile), pointer: '/name', message: `must be "${expectedName}"` });
      }
      if (v.status === 'frozen' && !existsSync(join(vdir, '.frozen', 'manifest.json'))) {
        issues.push({
          file: rel(vfile),
          pointer: '/status',
          message: 'frozen version has no .frozen/manifest.json — freeze it with `pnpm proto:freeze`',
        });
      }
      const routing = v.routing ?? 'hash';
      const routes = v.routes ?? [];
      const start = routing === 'hash' ? '#/' : '/';
      (v.scenarios ?? []).forEach(
        (/** @type {{ id: string, route: string }} */ s, /** @type {number} */ i) => {
          if (s.route !== start && !routes.includes(s.route))
            issues.push({
              file: rel(vfile),
              pointer: `/scenarios/${i}/route`,
              message: `"${s.route}" must be the start screen ${start} or listed in routes`,
            });
        },
      );
      const ids = (v.scenarios ?? []).map((/** @type {{ id: string }} */ s) => s.id);
      if (new Set(ids).size !== ids.length)
        issues.push({ file: rel(vfile), pointer: '/scenarios', message: 'scenario ids must be unique' });
      const axes = v.axes ?? [];
      const axisIds = axes.map((/** @type {{ id: string }} */ a) => a.id);
      if (new Set(axisIds).size !== axisIds.length)
        issues.push({ file: rel(vfile), pointer: '/axes', message: 'axis ids must be unique' });
      axes.forEach((/** @type {{ id: string, items: { id: string }[] }} */ a, /** @type {number} */ i) => {
        if (RESERVED_AXES.has(a.id))
          issues.push({
            file: rel(vfile),
            pointer: `/axes/${i}/id`,
            message: `"${a.id}" is a reserved query parameter`,
          });
        const itemIds = a.items.map((x) => x.id);
        if (new Set(itemIds).size !== itemIds.length)
          issues.push({ file: rel(vfile), pointer: `/axes/${i}/items`, message: 'item ids must be unique' });
      });
      versions.push({
        version: name,
        title: v.title ?? '',
        date: v.date,
        author: v.author,
        status: v.status,
        changelog: v.changelog,
        baseVersion: v.baseVersion ?? null,
        designSource: v.designSource ?? null,
        routing,
        routes,
        scenarios: v.scenarios ?? [{ id: DEFAULT_SCENARIO.id, title: DEFAULT_SCENARIO.title, route: start }],
        axes,
        path: `/p/${slug}/${name}/`,
      });
    }
    versions.sort((a, b) => versionNumber(a.version) - versionNumber(b.version));
    if (versions.length === 0) {
      issues.push({ file: rel(versionsDir), pointer: '', message: 'prototype has no versions' });
      continue;
    }
    for (const v of versions) {
      if (v.baseVersion && !versions.some((x) => x.version === v.baseVersion)) {
        issues.push({
          file: rel(join(versionsDir, v.version, 'version.json')),
          pointer: '/baseVersion',
          message: `version ${v.baseVersion} does not exist`,
        });
      }
    }
    const defaultVersion = resolveDefaultVersion(meta.defaultVersion, versions);
    if (!versions.some((v) => v.version === defaultVersion)) {
      issues.push({
        file: rel(protoFile),
        pointer: '/defaultVersion',
        message: `version ${meta.defaultVersion} does not exist`,
      });
      continue;
    }
    prototypes.push({
      slug,
      title: meta.title,
      description: meta.description ?? '',
      owner: meta.owner,
      tags: meta.tags ?? [],
      status: meta.status,
      designSource: meta.designSource ?? null,
      defaultVersion: /** @type {string} */ (defaultVersion),
      separatePassword: meta.separatePassword ?? false,
      platform,
      platforms: [platform, ...(meta.platforms ?? []).filter((/** @type {string} */ x) => x !== platform)],
      menu: { versions: meta.menu?.versions ?? true, style: meta.menu?.style ?? 'ds' },
      updated:
        versions
          .map((v) => v.date)
          .sort()
          .at(-1) ?? '',
      path: `/p/${slug}/`,
      versions,
    });
  }

  if (issues.length > 0) throw new RegistryError(issues);
  return { schemaVersion: 1, prototypes };
}

/**
 * Validate one metadata file in isolation (used by hooks and editors).
 * @param {'prototype' | 'version'} kind
 * @param {unknown} data
 * @param {string} [file]
 */
export function validateMetadata(
  kind,
  data,
  file = kind === 'prototype' ? 'prototype.json' : 'version.json',
) {
  /** @type {import('./index.d.ts').RegistryIssue[]} */
  const issues = [];
  schemaIssues(kind === 'prototype' ? validatePrototype : validateVersion, data, file, issues);
  return issues;
}

/** Stable JSON output (2-space indent, trailing newline). @param {unknown} registry */
export const serializeRegistry = (registry) => `${JSON.stringify(registry, null, 2)}\n`;
