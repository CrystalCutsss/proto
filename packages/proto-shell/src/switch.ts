// Pure URL logic of the version switcher (unit-tested without a browser).

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

/**
 * URL to open when switching from `current` to `target`. The screen is kept only when the target version
 * lists it in `routes` and uses the same routing; otherwise the target's start screen opens.
 */
export function targetUrl(loc: LocationLike, slug: string, current: SwitchVersion, target: SwitchVersion) {
  const base = versionBase(slug, target.version);
  const key = screenKey(loc, versionBase(slug, current.version), current.routing);
  const isRoot = key === '#/' || key === '/';
  const keep = !isRoot && current.routing === target.routing && target.routes.includes(key);
  if (!keep) return `${base}${loc.search}`;
  return target.routing === 'hash' ? `${base}${loc.search}${key}` : `${base}${key.slice(1)}${loc.search}`;
}

/** Read slug and version from the meta tags injected by build-kit, falling back to the URL. */
export function currentContext(doc: Document, loc: LocationLike) {
  const meta = (name: string) => doc.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? '';
  const m = /^\/p\/([a-z0-9-]+)\/(v\d+)\//.exec(loc.pathname);
  const slug = meta('proto:prototype') || m?.[1] || '';
  const version = meta('proto:version') || m?.[2] || '';
  return slug && version ? { slug, version } : null;
}
