// Hub data helpers (pure, unit-tested).
import type { Registry, RegistryPrototype, RegistryVersion } from '@proto/registry';

export async function loadRegistry(fetchImpl: typeof fetch = fetch): Promise<Registry> {
  const res = await fetchImpl('/registry.json', { cache: 'no-cache', credentials: 'same-origin' });
  if (!res.ok) throw new Error(`registry.json: HTTP ${res.status}`);
  return (await res.json()) as Registry;
}

/** Prototypes shown on main: everything but archived, most recently updated first. */
export function visiblePrototypes(prototypes: RegistryPrototype[]): RegistryPrototype[] {
  return prototypes
    .filter((p) => p.status !== 'archived')
    .sort((a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title, 'ru'));
}

export const PLATFORM_LABEL: Record<RegistryPrototype['platform'], string> = {
  mobile: 'PWA',
  desktop: 'Desktop',
};

/** Card subtitle, e.g. "Обновлён 2026-10-14 · PWA · 1 версия". */
export const cardMeta = (p: RegistryPrototype) =>
  [
    `Обновлён ${p.updated}`,
    PLATFORM_LABEL[p.platform] ?? PLATFORM_LABEL.desktop,
    plural(p.versions.length, ['версия', 'версии', 'версий']),
  ].join(' · ');

/** Versions for the changelog dialog, newest first. */
export const versionsNewestFirst = (p: RegistryPrototype): RegistryVersion[] => [...p.versions].reverse();

/** Viewer URL of a prototype, optionally pinned to a version. */
export const viewerUrl = (p: RegistryPrototype, version?: string) =>
  version ? `${p.path}?v=${encodeURIComponent(version)}` : p.path;

export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

export const STATUS_LABEL: Record<string, string> = {
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
