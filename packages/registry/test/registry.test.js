import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildRegistry, RegistryError, resolveDefaultVersion, validateMetadata } from '../src/index.js';

/** @type {string} */
let root;

/** @param {string} rel @param {unknown} data */
const put = (rel, data) => {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
};

const proto = (over = {}) => ({
  title: 'Demo',
  owner: 'Kirill',
  status: 'active',
  defaultVersion: 'latest',
  ...over,
});
/** @param {string} v @param {object} [over] */
const version = (v, over = {}) => ({
  version: v,
  date: '2026-10-13',
  author: 'Kirill',
  status: 'draft',
  changelog: ['Initial'],
  ...over,
});

/** @param {string} slug @param {string} v @param {object} [over] */
const addVersion = (slug, v, over) => {
  put(`prototypes/${slug}/versions/${v}/version.json`, version(v, over));
  put(`prototypes/${slug}/versions/${v}/package.json`, { name: `@proto/${slug}--${v}` });
};

/** @returns {RegistryError} */
const fail = () => {
  try {
    buildRegistry(root);
  } catch (e) {
    if (e instanceof RegistryError) return e;
    throw e;
  }
  throw new Error('expected RegistryError');
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'registry-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('buildRegistry', () => {
  it('returns an empty registry without prototypes', () => {
    expect(buildRegistry(root)).toEqual({ schemaVersion: 1, prototypes: [] });
  });

  it('builds sorted versions, resolves latest to the highest non-draft and applies defaults', () => {
    put('prototypes/demo/prototype.json', proto());
    addVersion('demo', 'v10', { status: 'draft', date: '2026-10-12' });
    addVersion('demo', 'v2', { status: 'review', date: '2026-10-11' });
    addVersion('demo', 'v1', { status: 'frozen' });
    put('prototypes/demo/versions/v1/.frozen/manifest.json', {});
    const reg = buildRegistry(root);
    const p = reg.prototypes[0];
    expect(p?.versions.map((v) => v.version)).toEqual(['v1', 'v2', 'v10']);
    expect(p?.defaultVersion).toBe('v2');
    expect(p?.tags).toEqual([]);
    expect(p?.updated).toBe('2026-10-13');
    expect(p?.versions[0]?.routing).toBe('hash');
    expect(p?.versions[0]?.path).toBe('/p/demo/v1/');
  });

  it('skips folders that hold only drive-inbox design input', () => {
    put('prototypes/early/versions/v1/design-input/01.png', 'png');
    put('prototypes/demo/prototype.json', proto());
    addVersion('demo', 'v1');
    put('prototypes/demo/versions/v2/design-input/01.png', 'png');
    const reg = buildRegistry(root);
    expect(reg.prototypes.map((p) => p.slug)).toEqual(['demo']);
    expect(reg.prototypes[0]?.versions.map((v) => v.version)).toEqual(['v1']);
    // anything else without metadata is still an error
    put('prototypes/demo/versions/v3/src/main.ts', '');
    expect(fail().issues.map((i) => i.file)).toEqual(['prototypes/demo/versions/v3/version.json']);
  });

  it('reports every problem with file and JSON pointer', () => {
    put('prototypes/a/prototype.json', proto({ status: 'wip', extra: 1 }));
    put('prototypes/b/prototype.json', proto({ defaultVersion: 'v3' }));
    addVersion('b', 'v1', { version: 'v2' });
    put('prototypes/Bad_Name/prototype.json', proto());
    const err = fail();
    const text = err.issues.map((i) => `${i.file} ${i.pointer} ${i.message}`);
    expect(text).toContain('prototypes/a/prototype.json /status must be one of active, paused, archived');
    expect(text).toContain('prototypes/a/prototype.json / unknown property "extra"');
    expect(text).toContain('prototypes/b/versions/v1/version.json /version must equal the folder name "v1"');
    expect(text.some((t) => t.startsWith('prototypes/Bad_Name'))).toBe(true);
    expect(err.message).toMatch(/Invalid prototype metadata/);
  });

  it('rejects frozen versions without a frozen build, wrong package names and bad base versions', () => {
    put('prototypes/demo/prototype.json', proto({ defaultVersion: 'v1' }));
    addVersion('demo', 'v1', { status: 'frozen', baseVersion: 'v2' });
    put('prototypes/demo/versions/v1/package.json', { name: 'wrong' });
    const msgs = fail().issues.map((i) => `${i.pointer} ${i.message}`);
    expect(msgs.some((m) => m.includes('.frozen/manifest.json'))).toBe(true);
    expect(msgs).toContain('/name must be "@proto/demo--v1"');
    expect(msgs).toContain('/baseVersion must be an earlier version');
  });

  it('rejects reserved slugs and invalid dates', () => {
    put('prototypes/compare/prototype.json', proto());
    expect(fail().issues[0]?.message).toMatch(/reserved/);
    expect(validateMetadata('version', version('v1', { date: '13.10.2026' }))[0]?.pointer).toBe('/date');
  });
});

describe('resolveDefaultVersion', () => {
  it('falls back to the highest version when all are drafts', () => {
    expect(resolveDefaultVersion('latest', [{ version: 'v1', status: 'draft' }])).toBe('v1');
    expect(resolveDefaultVersion('v3', [])).toBe('v3');
  });
});
