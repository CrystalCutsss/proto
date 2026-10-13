// Catalog filtering (pure, unit-tested).
import type { Registry, RegistryPrototype } from '@proto/registry';

export type StatusFilter = 'current' | 'active' | 'paused' | 'archived' | 'all';

export interface Filters {
  query: string;
  status: StatusFilter;
  tags: string[];
}

export async function loadRegistry(fetchImpl: typeof fetch = fetch): Promise<Registry> {
  const res = await fetchImpl('/registry.json', { cache: 'no-cache', credentials: 'same-origin' });
  if (!res.ok) throw new Error(`registry.json: HTTP ${res.status}`);
  return (await res.json()) as Registry;
}

export function allTags(prototypes: RegistryPrototype[]): string[] {
  return [...new Set(prototypes.flatMap((p) => p.tags))].sort();
}

const matchesStatus = (p: RegistryPrototype, status: StatusFilter) =>
  status === 'all' || (status === 'current' ? p.status !== 'archived' : p.status === status);

export function filterPrototypes(prototypes: RegistryPrototype[], f: Filters): RegistryPrototype[] {
  const q = f.query.trim().toLocaleLowerCase('ru');
  return prototypes
    .filter((p) => matchesStatus(p, f.status))
    .filter((p) => f.tags.every((t) => p.tags.includes(t)))
    .filter(
      (p) =>
        !q ||
        [p.title, p.description, p.owner, p.slug, ...p.tags].join(' ').toLocaleLowerCase('ru').includes(q),
    )
    .sort((a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title, 'ru'));
}

export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

export const STATUS_LABEL: Record<string, string> = {
  active: 'активен',
  paused: 'на паузе',
  archived: 'архив',
  draft: 'черновик',
  review: 'на ревью',
  frozen: 'заморожена',
};

export function plural(n: number, [one, few, many]: [string, string, string]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}
