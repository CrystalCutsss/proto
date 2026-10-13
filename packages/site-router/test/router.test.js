import { describe, expect, it } from 'vitest';
import { route, securityHeaders } from '../src/index.js';

/** @type {import('../src/index.d.ts').RouteRegistry} */
const registry = {
  prototypes: [
    {
      slug: 'demo',
      defaultVersion: 'v1',
      versions: [
        { version: 'v1', status: 'frozen', routing: 'hash' },
        { version: 'v2', status: 'review', routing: 'history' },
        { version: 'v3', status: 'draft', routing: 'hash' },
      ],
    },
  ],
};
const r = (/** @type {string} */ p, s = '') => route(p, s, registry);

describe('route', () => {
  it('serves the hub and service files', () => {
    expect(r('/')).toEqual({ type: 'asset', path: '/index.html', cache: 'revalidate' });
    expect(r('/registry.json')).toMatchObject({ type: 'asset', cache: 'no-cache' });
    expect(r('/_shell/loader.js')).toMatchObject({ type: 'asset', cache: 'no-cache' });
    expect(r('/assets/index-AbCd1234_x.js')).toMatchObject({ cache: 'immutable' });
  });

  it('redirects a prototype to its default version and keeps the query', () => {
    expect(r('/p/demo/', '?shell=0')).toEqual({
      type: 'redirect',
      location: '/p/demo/v1/?shell=0',
      status: 302,
    });
    expect(r('/p/demo')).toMatchObject({ location: '/p/demo/' });
    expect(r('/p/demo/v2')).toMatchObject({ location: '/p/demo/v2/' });
    expect(r('/p/')).toMatchObject({ location: '/' });
  });

  it('resolves latest to the highest non-draft version and keeps the sub-path', () => {
    expect(r('/p/demo/latest/cart', '?a=1')).toMatchObject({ location: '/p/demo/v2/cart?a=1' });
  });

  it('serves version files, with SPA fallback only for history routing', () => {
    expect(r('/p/demo/v1/')).toEqual({ type: 'asset', path: '/p/demo/v1/index.html', cache: 'revalidate' });
    expect(r('/p/demo/v1/screen')).toEqual({ type: 'asset', path: '/p/demo/v1/screen', cache: 'revalidate' });
    expect(r('/p/demo/v2/screen/1')).toMatchObject({ fallback: '/p/demo/v2/index.html' });
    expect(r('/p/demo/v2/logo.svg')).not.toHaveProperty('fallback');
    expect(r('/p/demo/v1/assets/main-0123456789.js')).toMatchObject({ cache: 'immutable' });
  });

  it('serves the compare page', () => {
    expect(r('/p/demo/compare/', '?a=v1&b=v2')).toMatchObject({ type: 'asset', path: '/compare.html' });
    expect(r('/p/demo/compare')).toMatchObject({ type: 'redirect', location: '/p/demo/compare/' });
  });

  it('rejects unknown prototypes and versions and unsafe paths', () => {
    for (const p of [
      '/p/nope/',
      '/p/demo/v9/',
      '/p/demo/../x',
      '/.git/config',
      '/p/demo/v1/.frozen/x',
      '/%E0%A4%A',
    ]) {
      expect(r(p), p).toEqual({ type: 'not-found' });
    }
  });
});

describe('securityHeaders', () => {
  it('never allows shared caches', () => {
    for (const c of /** @type {const} */ (['immutable', 'revalidate', 'no-cache'])) {
      expect(securityHeaders(c)['Cache-Control']).toMatch(/^private/);
      expect(securityHeaders(c)['X-Robots-Tag']).toContain('noindex');
    }
  });
});
