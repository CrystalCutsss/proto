import type { RegistryPrototype } from '@proto/registry';
import { describe, expect, it } from 'vitest';
import { allTags, filterPrototypes, plural } from '../src/data.ts';

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
  updated: '2026-10-01',
  path: `/p/${slug}/`,
  versions: [],
  ...over,
});

const list = [
  p('checkout', { tags: ['mobile', 'payments'], updated: '2026-10-10', description: 'Оформление заказа' }),
  p('onboarding', { tags: ['mobile'], status: 'paused' }),
  p('old', { status: 'archived' }),
];

describe('filterPrototypes', () => {
  it('hides archived by default and sorts by update date', () => {
    expect(filterPrototypes(list, { query: '', status: 'current', tags: [] }).map((x) => x.slug)).toEqual([
      'checkout',
      'onboarding',
    ]);
  });

  it('filters by status, all tags and a case-insensitive query', () => {
    expect(filterPrototypes(list, { query: '', status: 'archived', tags: [] }).map((x) => x.slug)).toEqual([
      'old',
    ]);
    expect(filterPrototypes(list, { query: '', status: 'all', tags: ['mobile', 'payments'] })).toHaveLength(
      1,
    );
    expect(filterPrototypes(list, { query: 'ЗАКАЗ', status: 'all', tags: [] })[0]?.slug).toBe('checkout');
  });

  it('collects tags and pluralizes in Russian', () => {
    expect(allTags(list)).toEqual(['mobile', 'payments']);
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
