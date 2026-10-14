import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  defaultIconSvg,
  defineVersionConfig,
  FORBIDDEN_CDN,
  ICON_SIZES,
  initials,
  manifest,
  pwaTags,
  renderIcons,
  shellTags,
  versionContext,
} from '../src/index.js';

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

describe('web app manifest (ADR-0019)', () => {
  const ctx = { slug: 'credit-activation', version: 'v2', base: '/p/credit-activation/v2/' };
  const names = { name: 'Единая активация · v2', shortName: 'Единая активация' };

  it('opens the version full screen with the whole site in scope', () => {
    const m = manifest(ctx, names);
    expect(m).toMatchObject({ start_url: '/p/credit-activation/v2/', scope: '/', display: 'standalone' });
    expect(m.icons).toEqual([
      expect.objectContaining({ src: '/p/credit-activation/v2/pwa/icon-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: '/p/credit-activation/v2/pwa/icon-512.png', sizes: '512x512' }),
    ]);
  });

  it('injects head tags, keeps the ones index.html already has, sends cookies for the manifest', () => {
    const tags = pwaTags(ctx, names, '<meta name="apple-mobile-web-app-capable" content="yes" />');
    const link = tags.find((t) => t.attrs?.rel === 'manifest');
    expect(link?.attrs).toMatchObject({
      href: '/p/credit-activation/v2/manifest.webmanifest',
      crossorigin: 'use-credentials',
    });
    expect(tags.some((t) => t.attrs?.name === 'apple-mobile-web-app-capable')).toBe(false);
    expect(tags.find((t) => t.attrs?.rel === 'apple-touch-icon')?.attrs?.href).toBe(
      '/p/credit-activation/v2/pwa/icon-180.png',
    );
  });

  it('derives initials and renders square PNG icons of every size', async () => {
    expect(initials('Единая активация')).toBe('ЕА');
    expect(initials('checkout-flow')).toBe('CF');
    expect(initials('3D демо')).toBe('3Д');
    expect(defaultIconSvg('<x> & y')).not.toMatch(/<x>/);
    const icons = await renderIcons(mkdtempSync(join(tmpdir(), 'pwa-')), 'Демо');
    expect([...icons.keys()]).toEqual([...ICON_SIZES]);
    const png = icons.get(180);
    expect(png?.subarray(1, 4).toString()).toBe('PNG');
    expect(png?.readUInt32BE(16)).toBe(180);
  });
});
