import { describe, expect, it } from 'vitest';
import { currentContext, screenKey, targetUrl, type SwitchVersion } from '../src/switch.ts';

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
