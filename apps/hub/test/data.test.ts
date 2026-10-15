import type { RegistryPrototype } from '@proto/registry';
import { describe, expect, it } from 'vitest';
import { cardMeta, plural, versionsNewestFirst, viewerUrl, visiblePrototypes } from '../src/data.ts';

const version = (v: string) => ({
  version: v,
  title: '',
  date: '2026-10-01',
  author: 'Кирилл',
  status: 'review' as const,
  changelog: [],
  baseVersion: null,
  designSource: null,
  routing: 'hash' as const,
  routes: [],
  scenarios: [{ id: 'main', title: 'Основной', route: '#/' }],
  path: `/p/x/${v}/`,
});

const p = (slug: string, over: Partial<RegistryPrototype> = {}): RegistryPrototype => ({
  slug,
  title: slug,
  description: '',
  owner: 'Кирилл',
  tags: [],
  status: 'active',
  designSource: null,
  defaultVersion: 'v1',
  separatePassword: false,
  platform: 'desktop',
  updated: '2026-10-01',
  path: `/p/${slug}/`,
  versions: [version('v1')],
  ...over,
});

describe('hub data', () => {
  it('hides archived prototypes and sorts by update date, then title', () => {
    const list = [
      p('b'),
      p('old', { status: 'archived', updated: '2026-12-01' }),
      p('a'),
      p('new', { updated: '2026-10-10', status: 'paused' }),
    ];
    expect(visiblePrototypes(list).map((x) => x.slug)).toEqual(['new', 'a', 'b']);
  });

  it('builds the card subtitle with the platform label and version count', () => {
    expect(cardMeta(p('x', { platform: 'mobile', updated: '2026-10-14' }))).toBe(
      'Обновлён 2026-10-14 · PWA · 1 версия',
    );
    expect(cardMeta(p('x', { versions: [version('v1'), version('v2')] }))).toBe(
      'Обновлён 2026-10-01 · Desktop · 2 версии',
    );
  });

  it('lists versions newest first and links to the viewer', () => {
    const x = p('x', { versions: [version('v1'), version('v2')] });
    expect(versionsNewestFirst(x).map((v) => v.version)).toEqual(['v2', 'v1']);
    expect(viewerUrl(x)).toBe('/p/x/');
    expect(viewerUrl(x, 'v1')).toBe('/p/x/?v=v1');
  });

  it('pluralizes in Russian', () => {
    expect([1, 2, 5, 11, 21, 22].map((n) => plural(n, ['версия', 'версии', 'версий']))).toEqual([
      '1 версия',
      '2 версии',
      '5 версий',
      '11 версий',
      '21 версия',
      '22 версии',
    ]);
  });
});
