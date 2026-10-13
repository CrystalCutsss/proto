import { describe, expect, it } from 'vitest';
import { defineVersionConfig, FORBIDDEN_CDN, shellTags, versionContext } from '../src/index.js';

describe('versionContext', () => {
  it('derives slug, version and base path', () => {
    expect(versionContext('/repo/prototypes/checkout-flow/versions/v12')).toEqual({
      slug: 'checkout-flow',
      version: 'v12',
      repoRoot: '/repo',
      base: '/p/checkout-flow/v12/',
    });
  });

  it('rejects other locations and bad names', () => {
    expect(() => versionContext('/repo/apps/hub')).toThrow(/not prototypes/);
    expect(() => versionContext('/repo/prototypes/Bad/versions/v1')).toThrow(/invalid/);
    expect(() => versionContext('/repo/prototypes/ok/versions/v0')).toThrow(/invalid/);
  });
});

describe('defineVersionConfig', () => {
  it('sets base and keeps user plugins after the preset', () => {
    const extra = { name: 'extra' };
    const cfg = defineVersionConfig('/repo/prototypes/a/versions/v1', { plugins: [extra] });
    expect(cfg.base).toBe('/p/a/v1/');
    expect(cfg.plugins?.at(-1)).toBe(extra);
    expect(cfg.build?.outDir).toBe('dist');
  });
});

describe('shell injection and CDN guard', () => {
  it('injects context meta tags and the loader, never the shell itself', () => {
    const tags = shellTags({ slug: 'a', version: 'v1' });
    expect(tags.map((t) => t.attrs?.src).filter(Boolean)).toEqual(['/_shell/loader.js']);
    expect(tags.find((t) => t.attrs?.name === 'proto:version')?.attrs?.content).toBe('v1');
  });

  it('detects public CDN URLs', () => {
    expect(FORBIDDEN_CDN.test('"https://www.gstatic.com/draco/v1/decoders/"')).toBe(true);
    expect(FORBIDDEN_CDN.test('import("//cdn.jsdelivr.net/npm/x")')).toBe(true);
    expect(FORBIDDEN_CDN.test('"/p/a/v1/assets/draco/"')).toBe(false);
  });
});
