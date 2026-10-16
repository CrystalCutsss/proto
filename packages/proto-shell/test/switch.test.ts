import { describe, expect, it } from 'vitest';
import {
  axisSearch,
  axisValues,
  currentContext,
  keptScreen,
  screenFromViewerHash,
  screenKey,
  screenUrl,
  targetUrl,
  viewerUrl,
  type SwitchVersion,
} from '../src/switch.ts';

const hash = (version: string, routes: string[] = []): SwitchVersion => ({
  version,
  routing: 'hash',
  routes,
});
const hist = (version: string, routes: string[] = []): SwitchVersion => ({
  version,
  routing: 'history',
  routes,
});
const loc = (pathname: string, hashPart = '', search = '') => ({ pathname, hash: hashPart, search });

describe('screenKey', () => {
  it('reads the screen from the hash or the path', () => {
    expect(screenKey(loc('/p/a/v1/', '#/cart'), '/p/a/v1/', 'hash')).toBe('#/cart');
    expect(screenKey(loc('/p/a/v1/', ''), '/p/a/v1/', 'hash')).toBe('#/');
    expect(screenKey(loc('/p/a/v1/cart'), '/p/a/v1/', 'history')).toBe('/cart');
    expect(screenKey(loc('/p/a/v1/index.html'), '/p/a/v1/', 'history')).toBe('/');
  });
});

describe('targetUrl', () => {
  it('keeps the screen when the target version has it', () => {
    expect(targetUrl(loc('/p/a/v1/', '#/cart', '?x=1'), 'a', hash('v1'), hash('v2', ['#/cart']))).toBe(
      '/p/a/v2/?x=1#/cart',
    );
    expect(targetUrl(loc('/p/a/v1/cart'), 'a', hist('v1'), hist('v2', ['/cart']))).toBe('/p/a/v2/cart');
  });

  it('opens the start screen when the screen is unknown or routing differs', () => {
    expect(targetUrl(loc('/p/a/v1/', '#/cart'), 'a', hash('v1'), hash('v2', ['#/home']))).toBe('/p/a/v2/');
    expect(targetUrl(loc('/p/a/v1/', '#/cart'), 'a', hash('v1'), hist('v2', ['#/cart']))).toBe('/p/a/v2/');
  });
});

describe('currentContext', () => {
  it('prefers meta tags and falls back to the URL', () => {
    document.head.innerHTML =
      '<meta name="proto:prototype" content="demo"><meta name="proto:version" content="v3">';
    expect(currentContext(document, loc('/x/'))).toEqual({ slug: 'demo', version: 'v3' });
    document.head.innerHTML = '';
    expect(currentContext(document, loc('/p/other/v2/'))).toEqual({ slug: 'other', version: 'v2' });
    expect(currentContext(document, loc('/'))).toBeNull();
  });
});

describe('viewer URLs', () => {
  it('builds iframe and viewer URLs for both routing modes', () => {
    expect(screenUrl('a', hash('v2'), '#/cart', '?bars=0')).toBe('/p/a/v2/?bars=0#/cart');
    expect(screenUrl('a', hash('v2'), '#/', '?bars=0')).toBe('/p/a/v2/?bars=0');
    expect(screenUrl('a', hist('v2'), '/cart', '?bars=0')).toBe('/p/a/v2/cart?bars=0');
    expect(screenUrl('a', hist('v2'), null)).toBe('/p/a/v2/');
    expect(viewerUrl('a', 'v2', 'main', '#/cart')).toBe('/p/a/?v=v2&s=main#/cart');
    expect(viewerUrl('a', 'v2', 'main', '/cart')).toBe('/p/a/?v=v2&s=main#/cart');
    expect(viewerUrl('a', 'v1', 'main', '#/')).toBe('/p/a/?v=v1&s=main');
  });

  it('reads the screen back from the viewer hash', () => {
    expect(screenFromViewerHash('#/cart', 'hash')).toBe('#/cart');
    expect(screenFromViewerHash('#/cart', 'history')).toBe('/cart');
    expect(screenFromViewerHash('', 'hash')).toBeNull();
  });

  it('keeps a screen only when the target lists it', () => {
    expect(keptScreen('#/cart', hash('v1'), hash('v2', ['#/cart']))).toBe('#/cart');
    expect(keptScreen('#/', hash('v1'), hash('v2', ['#/']))).toBeNull();
    expect(keptScreen('#/cart', hash('v1'), hist('v2', ['#/cart']))).toBeNull();
  });
});

describe('menu axes', () => {
  const axes = [
    { id: 'product', items: [{ id: 'kn' }, { id: 'ok' }] },
    { id: 'docs', items: [{ id: 'one' }, { id: 'two' }] },
  ];

  it('reads valid values and falls back to the first item', () => {
    expect(axisValues(axes, new URLSearchParams('product=ok&docs=three'))).toEqual({
      product: 'ok',
      docs: 'one',
    });
    expect(axisValues([], new URLSearchParams('product=ok'))).toEqual({});
  });

  it('puts axis values into iframe and viewer URLs', () => {
    expect(axisSearch({ product: 'ok' }, { bars: '0' })).toBe('?bars=0&product=ok');
    expect(axisSearch({})).toBe('');
    expect(viewerUrl('a', 'v2', 'main', '#/docs', { product: 'ok', docs: 'two' })).toBe(
      '/p/a/?v=v2&product=ok&docs=two#/docs',
    );
  });
});
