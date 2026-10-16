// Pure URL logic of the viewer and the version/scenario menu (unit-tested without a browser).

export interface SwitchVersion {
  version: string;
  routing: 'hash' | 'history';
  routes: string[];
}

export interface LocationLike {
  pathname: string;
  search: string;
  hash: string;
}

export const versionBase = (slug: string, version: string) => `/p/${slug}/${version}/`;

/** Current screen: "#/cart" for hash routing, "/cart" for history routing; root is "#/" or "/". */
export function screenKey(loc: LocationLike, base: string, routing: 'hash' | 'history'): string {
  if (routing === 'hash') return loc.hash && loc.hash !== '#' ? loc.hash : '#/';
  const tail = loc.pathname.startsWith(base) ? loc.pathname.slice(base.length) : '';
  return `/${tail.replace(/index\.html$/, '')}`;
}

/** Start screen key of a routing mode. */
export const startScreen = (routing: 'hash' | 'history') => (routing === 'hash' ? '#/' : '/');

/**
 * Screen to keep when switching from `current` to `target`: kept only when the target version lists it in
 * `routes` and uses the same routing; otherwise null (open the target's start screen).
 */
export function keptScreen(key: string, current: SwitchVersion, target: SwitchVersion): string | null {
  const isRoot = key === '#/' || key === '/';
  return !isRoot && current.routing === target.routing && target.routes.includes(key) ? key : null;
}

/** URL of a version screen; `search` (with "?") goes before the hash for hash routing. */
export function screenUrl(slug: string, v: SwitchVersion, key: string | null, search = '') {
  const base = versionBase(slug, v.version);
  if (!key || key === startScreen(v.routing)) return `${base}${search}`;
  return v.routing === 'hash' ? `${base}${search}${key}` : `${base}${key.replace(/^\//, '')}${search}`;
}

/** URL to open when switching from `current` to `target` (see keptScreen). */
export function targetUrl(loc: LocationLike, slug: string, current: SwitchVersion, target: SwitchVersion) {
  const key = screenKey(loc, versionBase(slug, current.version), current.routing);
  return screenUrl(slug, target, keptScreen(key, current, target), loc.search);
}

/** Menu axis as the switcher needs it: an id and its item ids, the first being the default. */
export interface SwitchAxis {
  id: string;
  items: { id: string }[];
}

/** Chosen item of every axis: the query value when it names an item, else the axis's first item. */
export function axisValues(axes: SwitchAxis[], params: URLSearchParams): Record<string, string> {
  return Object.fromEntries(
    axes.map((a) => {
      const v = params.get(a.id);
      return [a.id, a.items.some((i) => i.id === v) ? v! : (a.items[0]?.id ?? '')];
    }),
  );
}

/** Query string ("?a=1&b=2", or "") of axis values on top of `extra` parameters. */
export function axisSearch(values: Record<string, string>, extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ ...extra, ...values });
  return q.size ? `?${q}` : '';
}

/**
 * Viewer URL (/p/<slug>/?v=…&s=…#screen); the screen goes into the hash for both routing modes. A version with
 * menu axes carries their values instead of the scenario.
 */
export function viewerUrl(
  slug: string,
  version: string,
  scenario: string,
  key: string | null,
  axes: Record<string, string> = {},
) {
  const q = new URLSearchParams(
    Object.keys(axes).length ? { v: version, ...axes } : { v: version, s: scenario },
  );
  const hash = key && key !== '#/' && key !== '/' ? `#${key.replace(/^#/, '')}` : '';
  return `/p/${slug}/?${q}${hash}`;
}

/** Screen key from a viewer hash ("#/cart") for the version's routing. */
export const screenFromViewerHash = (hash: string, routing: 'hash' | 'history') => {
  const path = hash.replace(/^#/, '');
  if (!path.startsWith('/')) return null;
  return routing === 'hash' ? `#${path}` : path;
};

/** Read slug and version from the meta tags injected by build-kit, falling back to the URL. */
export function currentContext(doc: Document, loc: LocationLike) {
  const meta = (name: string) => doc.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? '';
  const m = /^\/p\/([a-z0-9-]+)\/(v\d+)\//.exec(loc.pathname);
  const slug = meta('proto:prototype') || m?.[1] || '';
  const version = meta('proto:version') || m?.[2] || '';
  return slug && version ? { slug, version } : null;
}
